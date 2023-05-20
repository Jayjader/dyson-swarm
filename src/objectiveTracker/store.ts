import { writable } from "svelte/store";
import {
  ALL_OBJECTIVES,
  findAutoStartPositions,
  findTriggeredSteps,
  getNestedItem,
  type Objective,
  type ObjectivePosition,
  type Step,
} from "./objectives";

import type { Trigger } from "./triggers";
import { GuideOpened } from "./triggers";

type SerializedPosition = ReturnType<typeof JSON.stringify>;
export type TrackedObjectives = {
  open: boolean;
  started: Set<SerializedPosition>;
  completed: Set<SerializedPosition>;
  active: ObjectivePosition;
};
export function makeObjectiveTracker(
  tracking: TrackedObjectives = {
    open: false,
    started: new Set([]),
    completed: new Set([]),
    active: [],
  }
) {
  for (let position of findAutoStartPositions(ALL_OBJECTIVES)) {
    tracking.started.add(JSON.stringify(position));
  }
  console.debug({ initallyStarted: tracking.started });
  const { update, subscribe } = writable(tracking);

  const store = {
    objectives: ALL_OBJECTIVES,
    subscribe,
    open: () => {
      update((state) => ((state.open = true), state));
      store.handleTriggers([GuideOpened]);
    },
    close: () => update((state) => ((state.open = false), state)),
    setActive: (p: ObjectivePosition) =>
      update((state) => {
        console.debug({
          message: "set active",
          p,
          started: [...state.started],
        });
        state.active = p;
        state.started.add(JSON.stringify(p));
        if (p.length > 1) {
          const loopStack = p.slice();
          let coordinate;
          while (loopStack.pop() !== undefined) {
            state.started.add(JSON.stringify(loopStack));
          }
        }
        return state;
      }),
    clearProgress: () =>
      update(
        (state) => (state.completed.clear(), state.started.clear(), state)
      ),
    handleTriggers: (triggers: Trigger[]) => {
      const triggered = findTriggeredSteps(store.objectives, triggers);
      if (triggered.completed.size === 0 && triggered.started.size === 0) {
        return;
      }
      console.debug({ triggered });
      update((state) => {
        const { completed, started } = state;
        for (let position of triggered.started) {
          started.add(position);
        }
        for (let position of triggered.completed) {
          completed.add(position);
        }
        console.debug({ started: [...started], completed: [...completed] });
        state.completed = completed;
        state.started = started;
        return state;
      });
    },
  };
  return store;
}
export type ObjectiveTracker = ReturnType<typeof makeObjectiveTracker>;

export const OBJECTIVE_TRACKER_CONTEXT = Symbol(
  "svelte context key for objective tracker store"
);

export function debugProgress(
  started: Set<SerializedPosition>,
  completed: Set<SerializedPosition>,
  objectives: Objective[]
) {
  let debugProgress = [...completed].map((serializedPosition) => {
    const position = JSON.parse(serializedPosition);
    try {
      return [
        serializedPosition,
        getNestedItem(objectives, position).title,
      ] as const;
    } catch {
      try {
        const parent = getNestedItem(
          objectives,
          position.slice(0, -1)
        ) as Objective & { steps: Step[] };
        return [
          serializedPosition,
          `${parent.title}##${
            parent.steps[position.at(-1)][0] // step details
          }`,
        ] as const;
      } catch {
        try {
          const parent = getNestedItem(
            objectives,
            position.slice(0, -2)
          ) as Objective & { steps: Step[] };
          return [
            serializedPosition,
            `${parent.title}##${
              parent.steps[position.at(-2)][0] // step details
            }##${
              position.at(-1) // step completion count
            }`,
          ] as const;
        } catch {
          return [serializedPosition, serializedPosition] as const;
        }
      }
    }
  });
  debugProgress.sort(([sPosA, txtA], [sPosB, txtB]) =>
    sPosA > sPosB ? 1 : -1
  ); // everything is serialized as a file-system-path-like-string, so this alphanumeric sort will group sub-objectives
  const startedProgress = [...started].map(
    (serializedPosition) =>
      [
        serializedPosition,
        getNestedItem(objectives, JSON.parse(serializedPosition)),
      ] as const
  );
  startedProgress.sort(([sPosA, txtA], [sPosB, txtB]) =>
    sPosA > sPosB ? 1 : -1
  );
  console.debug({
    debugProgress: {
      completed: new Map(debugProgress),
      started: new Map(startedProgress),
    },
  });
}
