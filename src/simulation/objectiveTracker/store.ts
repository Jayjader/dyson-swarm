import { writable } from "svelte/store";
import type { EventTag } from "../../events/events";
import { Construct } from "../../gameRules";

export const FabricatorOpened = Symbol("fabricator panel opened");
export const EditingQueue = Symbol("started editing fabricator build queue");
export const AddBuildOrder = Symbol(
  "inserted build order into the fabricator's build queue during editing"
);
export const AddRepeatOrder = Symbol(
  "inserted repeat build order into the fabricator's build queue during editing"
);

export type Trigger =
  | typeof FabricatorOpened
  | typeof EditingQueue
  | typeof AddBuildOrder
  | [typeof AddBuildOrder, Construct]
  | [typeof AddRepeatOrder, number]
  | EventTag
  | [EventTag, ...unknown[]];

export type Objective = { title: string } & (
  | { subObjectives: Objective[] }
  | {
      details: string[];
      steps: [string, Trigger][];
    }
);
function hasSubObjectives(
  o: Objective
): o is Objective & { subObjectives: Objective[] } {
  return Array.isArray(
    (o as unknown as { subObjectives: Objective[] })?.subObjectives
  );
}

export type ObjectivePosition = number[];

export const ALL_OBJECTIVES: Objective[] = [
  {
    title: "Building the Swarm",
    subObjectives: [
      {
        title: "Metal Production",
        subObjectives: [
          {
            title: "Fabricate 1 Miner",
            details: [
              "The first order of priority is to set up a basic metal production chain. This will allow you to begin tapping into the planet's resources, an essential step in building the swarm.",
              "Metal production starts with <a>miners</a> extracting ore from the planet's crust. Fabricate one, and make sure it is <a>working</a>.",
            ],
            steps: [
              ["Open the <a>Fabricator Panel</a>", FabricatorOpened],
              ["Start editing the <a>Build Queue</a>", EditingQueue],
              [
                "Add a build order for a <a>Miner</a> to the queue",
                [AddBuildOrder, Construct.MINER],
              ],
              ["<a>Save</a> the changed queue", "command-set-fabricator-queue"],
              [
                "<a>Wait</a> for the fabricator to <a>Work</a> and complete that build order",
                ["construct-fabricated", Construct.MINER],
              ],
            ],
          },
          {
            title: "Fabricate 1 Refiner",
            details: [
              "Now that we are extracting ore, we can proceed to the second part of metal production: refining that ore into metal that can be used for further fabrication.",
              "Fabricate a <a>refiner</a>, and make sure it is <a>working</a>",
            ],
            steps: [
              ["Open the <a>Fabricator Panel</a>", FabricatorOpened],
              ["Start editing the <a>Build Queue</a>", EditingQueue],
              [
                "Add a build order for a <a>Refiner</a> to the queue",
                [AddBuildOrder, Construct.REFINER],
              ],
              ["<a>Save</a> the changed queue", "command-set-fabricator-queue"],
              [
                "<a>Wait</a> for the fabricator to <a>Work</a>",
                ["construct-fabricated", Construct.REFINER],
              ],
            ],
          },
        ],
      },
      {
        title: "Energy Production",
        subObjectives: [
          {
            title: "Fabricate 10 Solar Collectors",
            details: ["###TODO###"],
            steps: [
              ["Open the <a>Fabricator Panel</a>", FabricatorOpened],
              ["Start editing the <a>Build Queue</a>", EditingQueue],
              [
                "Add a repeating build order for 10 <a>Solar Collectors</a> to the queue",
                [AddRepeatOrder, 10],
              ],
              ["<a>Save</a> the changed queue", "command-set-fabricator-queue"],
              [
                "<a>Wait</a> for the fabricator to <a>Work</a>",
                ["construct-fabricated", Construct.SOLAR_COLLECTOR, 10],
              ],
            ],
          },
        ],
      },
      {
        title: "Satellite Production",
        subObjectives: [
          {
            title: "###TODO###",
            details: ["$##TODO##$"],
            steps: [],
          },
        ],
      },
    ],
  },
  {
    title: "Manipulating the Simulation",
    subObjectives: [
      {
        title: "Controlling the Flow of Time",
        subObjectives: [
          {
            title: "Play and Pause the Simulation Clock",
            details: [],
            steps: [],
          },
          { title: "Changing the Clock Speed", details: [], steps: [] },
        ],
      },
      {
        title: "Controlling Fabrication",
        subObjectives: [
          {
            title: "Single Build Orders",
            subObjectives: [
              { title: "Insert a Build Order", details: [], steps: [] },
              {
                title: "Change a Build Order's Construct",
                details: [],
                steps: [],
              },
              { title: "Remove a Build Order", details: [], steps: [] },
            ],
          },
          {
            title: "Repeat Build Orders",
            subObjectives: [
              { title: "Create a Repeat Order", details: [], steps: [] },
              { title: "Remove a Repeat Order", details: [], steps: [] },
              {
                title: "Change a Repeat Order's Count",
                details: [],
                steps: [],
              },
              {
                title: "Create an infinite Repeat Order",
                details: [],
                steps: [],
              },
              { title: "Unwrap a Repeat Order", details: [], steps: [] },
            ],
          },
        ],
      },
    ],
  },
];

export function getPositionOfFirstItem(
  list: Objective[],
  position: ObjectivePosition = [0]
): ObjectivePosition {
  const element = getNestedItem(list, position);
  if (!hasSubObjectives(element)) {
    return position;
  }
  return [...position, ...getPositionOfFirstItem(element.subObjectives)];
}
export function getNestedItem(
  list: Objective[],
  position: ObjectivePosition
): Objective {
  if (position.length < 2) {
    return list[position[0]];
  } else {
    const [currentIndex, ...next] = position;
    return getNestedItem(
      (list[currentIndex] as { subObjectives: Objective[] }).subObjectives,
      next
    );
  }
}

type SerializedPosition = ReturnType<typeof JSON.stringify>;
export type TrackedObjectives = {
  open: boolean;
  progress: Set<SerializedPosition>;
  active: ObjectivePosition;
};
export function makeObjectiveTracker(
  tracking: TrackedObjectives = {
    open: false,
    progress: new Set([]),
    active: [],
  }
) {
  const { update, subscribe } = writable(tracking);
  function findTriggeredSteps(
    objectives: Objective[],
    triggers: (Trigger | EventTag)[],
    position: number[] = []
  ): ObjectivePosition[] {
    const triggered = [];
    const nestedPosition = [...position, -1];
    for (let objective of objectives) {
      nestedPosition[nestedPosition.length - 1] += 1;
      if (hasSubObjectives(objective)) {
        triggered.push(
          ...findTriggeredSteps(
            objective.subObjectives,
            triggers,
            nestedPosition
          )
        );
      } else {
        const stepPosition = [...nestedPosition, -1];
        for (let step of objective.steps) {
          stepPosition[stepPosition.length - 1] += 1;
          const condition = step[1];
          if (!Array.isArray(condition)) {
            for (let trigger of triggers) {
              if (trigger === condition) {
                console.debug({
                  simpleTrigger: {
                    trigger,
                    condition,
                    position,
                    step,
                    stepPosition,
                  },
                });
                triggered.push([...stepPosition]);
                break;
              }
            }
          } else {
            for (let trigger of triggers) {
              if (
                Array.isArray(trigger) &&
                trigger.every((element, index) => element === condition[index])
              ) {
                console.debug({
                  complexTrigger: {
                    trigger,
                    condition,
                    position,
                    step,
                    stepPosition,
                  },
                });
                triggered.push([...stepPosition]);
                break;
              }
            }
          }
        }
      }
    }
    return triggered;
  }
  const store = {
    objectives: ALL_OBJECTIVES,
    subscribe,
    open: () =>
      update((state) => {
        state.open = true;
        return state;
      }),
    close: () =>
      update((state) => {
        state.open = false;
        return state;
      }),
    setActive: (p: ObjectivePosition) =>
      update((state) => {
        state.active = p;
        return state;
      }),
    completeStep: (p: ObjectivePosition) =>
      update((state) => {
        state.progress.add(JSON.stringify(p));
        return state;
      }),
    clearProgress: () =>
      update((state) => {
        state.progress.clear();
        return state;
      }),
    handleTriggers: (triggers: Trigger[]) => {
      const triggered = findTriggeredSteps(store.objectives, triggers);
      if (triggered.length > 0) {
        update((state) => {
          for (let position of triggered) {
            // only count as triggered if previous sibling steps are complete
            const currentStepIndex = position.at(-1)!;
            if (currentStepIndex > 0) {
              let previousComplete = true;
              for (let i = currentStepIndex - 1; i >= 0; i--) {
                if (
                  !state.progress.has(
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
                continue;
              }
            }
            state.progress.add(JSON.stringify(position));
            // if we are the last child of our parent, add it to progress as well
            const parentPosition = position.slice(0, position.length - 1);
            const parent = getNestedItem(store.objectives, parentPosition);
            if (
              position.at(-1) ===
              (hasSubObjectives(parent) ? parent.subObjectives : parent.steps)
                .length -
                1
            ) {
              state.progress.add(JSON.stringify(parentPosition));
            }
          }
          return state;
        });
      }
    },
  };
  return store;
}
export type ObjectiveTracker = ReturnType<typeof makeObjectiveTracker>;

export const OBJECTIVE_TRACKER_CONTEXT = Symbol(
  "svelte context key for objective tracker store"
);