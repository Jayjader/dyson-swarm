import { writable } from "svelte/store";
import {
  ALL_OBJECTIVES,
  findAutoStartPositions,
  findTriggeredSteps,
  getNestedItem,
  hasSubObjectives,
  type Objective,
  type ObjectivePosition,
  type Step,
  type Trigger,
} from "./objectives";

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
    open: () => update((state) => ((state.open = true), state)),
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
    clearProgress: () => update((state) => (state.completed.clear(), state)),
    handleTriggers: (triggers: Trigger[]) => {
      const triggered = findTriggeredSteps(store.objectives, triggers);
      if (triggered.completed.length === 0 && triggered.started.length === 0) {
        return;
      }
      console.debug({ triggered });
      update((state) => {
        const { completed, started } = state;
        for (let position of triggered.started) {
          started.add(JSON.stringify(position));
        }
        console.debug({ started: [...started] });
        for (let position of triggered.completed) {
          {
            // if not the first step, only trigger if (all) previous sibling steps are complete
            const currentStepIndex = position.at(-1)!;
            if (currentStepIndex > 0) {
              let previousComplete = true;
              for (let i = currentStepIndex - 1; i >= 0; i--) {
                if (
                  !completed.has(
                    JSON.stringify([
                      ...position.slice(0, position.length - 1),
                      i,
                    ])
                  )
                ) {
                  previousComplete = false;
                  break;
                }
              }
              if (!previousComplete) {
                continue; // skip to considered next triggered position
              }
            }
          }

          {
            const parentObjectivePosition = position.slice(
              0,
              position.length - 1
            );
            const parentObjective = getNestedItem(
              store.objectives,
              parentObjectivePosition
            );
            const countForStepCompletion = hasSubObjectives(parentObjective)
              ? undefined
              : parentObjective.steps[position.at(-1)!]?.[2];
            if (countForStepCompletion) {
              // step has a defined count => the trigger needs to be seen [count] times
              // this is essentially handled by treating each seen occurrence as a (fictional/virtual) 1-indexed sub-step of the current step's position
              let completedIndex = 1;
              let serialized: SerializedPosition;
              // scan forwards from first step (1-indexed), hanging on to loop counter and serialized position of first uncompleted step for later work
              while (
                ((serialized = JSON.stringify([...position, completedIndex])),
                completed.has(serialized))
              ) {
                completedIndex += 1;
              }
              if (completedIndex <= countForStepCompletion) {
                completed.add(serialized);

                if (completedIndex === countForStepCompletion) {
                  // this is the final count for this step => complete the entire step
                  completed.add(JSON.stringify(position));

                  if (
                    !hasSubObjectives(parentObjective) &&
                    position.at(-1) === parentObjective.steps.length - 1
                  ) {
                    // this is the final step for this objective => complete the objective
                    completed.add(JSON.stringify(parentObjectivePosition));
                  }
                }
              }
            } else {
              // step has no defined count => trigger just needs to be seen once to complete step
              completed.add(JSON.stringify(position));

              if (
                position.at(-1) ===
                (hasSubObjectives(parentObjective)
                  ? parentObjective.subObjectives
                  : parentObjective.steps
                ).length -
                  1
              ) {
                // we are the last child of our parent => complete it as well
                console.debug({
                  autoComplete: { position, parentObjectivePosition },
                });
                completed.add(JSON.stringify(parentObjectivePosition));
              }
            }
          }
        }
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
