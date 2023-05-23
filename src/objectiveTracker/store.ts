import { writable } from "svelte/store";
import type { Objective, ObjectivePosition, Step } from "./objectives";
import {
  findAutoStartPositions,
  propagateStartedFromTrigger,
  findTriggeredSteps,
  getNestedItem,
} from "./objectives";
import type { Trigger } from "./triggers";
import { GuideOpened } from "./triggers";
import { ALL_OBJECTIVES } from "./staticObjectiveList";

export type SerializedPosition = ReturnType<typeof JSON.stringify>;
export type TrackedObjectives = {
  open: boolean;
  started: Set<SerializedPosition>;
  completed: Set<SerializedPosition>;
  active: ObjectivePosition;
};
function init(
  tracking: TrackedObjectives,
  objectives: Objective[]
): TrackedObjectives {
  const autoStarts = new Set(
    findAutoStartPositions(objectives).map((position) =>
      JSON.stringify(position)
    )
  );
  console.debug({ init: [...autoStarts] });
  for (let position of [
    ...autoStarts,
    ...propagateStartedFromTrigger(objectives, autoStarts),
  ]) {
    tracking.started.add(position);
  }
  console.debug({ initallyStarted: tracking.started });
  return tracking;
}
export function makeObjectiveTracker(
  objectives = ALL_OBJECTIVES,
  tracking: TrackedObjectives = {
    open: false,
    started: new Set([]),
    completed: new Set([]),
    active: [],
  }
) {
  const { update, subscribe } = writable(init(tracking, objectives));

  const store = {
    objectives,
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
        if (p.length === 0) {
          return state;
        }
        state.started.add(JSON.stringify(p));
        if (p.length === 1) {
          return state;
        }
        const loopStack = p.slice();
        while ((loopStack.pop(), loopStack.length > 0)) {
          state.started.add(JSON.stringify(loopStack));
        }
        return state;
      }),
    clearProgress: () =>
      update(
        (state) => (
          state.completed.clear(),
          state.started.clear(),
          init(state, store.objectives)
        )
      ),
    handleTriggers: (triggers: Trigger[]) => {
      update((state) => {
        for (let trigger of triggers) {
          const previousSizes = {
            started: state.started.size,
            completed: state.completed.size,
          };
          const triggered = findTriggeredSteps(store.objectives, trigger, {
            started: new Set([...state.started]),
            completed: new Set([...state.completed]),
          });
          if (
            triggered.completed.size - previousSizes.completed === 0 &&
            triggered.started.size - previousSizes.started === 0
          ) {
            continue;
          }
          for (let position of triggered.started) {
            state.started.add(position);
          }
          for (let position of triggered.completed) {
            state.completed.add(position);
          }
        }
        return { ...state };
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
