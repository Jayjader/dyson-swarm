import { writable } from "svelte/store";
import type { EventTag } from "../events/events";
import { Construct } from "../gameRules";

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

export type Step = [string, Trigger] | [string, Trigger, number];
export type Objective = { title: string } & (
  | { subObjectives: Objective[] }
  | {
      details: string[];
      steps: Step[];
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
                ["construct-fabricated", Construct.SOLAR_COLLECTOR],
                10,
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
      {
        title: "Launching Your Packaged Satellites",
        subObjectives: [
          { title: "###TODO###", details: ["$##TODO##$"], steps: [] },
        ],
      },
      {
        title: "Meeting Excess Energy Quotas",
        subObjectives: [
          {
            title: "$#>TODO<#$",
            details: ["$>>TODO<<$"],
            steps: [
              // todo: make this earth global power consumption for year x
              // sample years: 2019 -> https://arxiv.org/pdf/2109.11443.pdf
            ],
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
  {
    title: "Ramping Up With Feedback Loops",
    subObjectives: [],
  },
];

/**
 * Returns position of first "leaf" objective, i.e. the first (sub-)objective with concrete steps, in the list
 */
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
export function getNextObjective(
  list: Objective[],
  position: ObjectivePosition
): [Objective, ObjectivePosition] | undefined {
  let parentPosition = position.slice(0, position.length - 1);
  const parent = getNestedItem(list, parentPosition);
  if (
    hasSubObjectives(parent) &&
    parent.subObjectives.length > position.at(-1)! + 1
  ) {
    return [
      parent.subObjectives[position.at(-1)! + 1],
      [...parentPosition, position.at(-1)! + 1],
    ];
  }
  // we are the last sub-objective
  // => "next" objective is next child of [first "recursive parent" that is not the last child of its parent]
  let grandParentPosition = parentPosition.slice(0, parentPosition.length - 1);
  let grandParent: Objective | undefined = getNestedItem(
    list,
    grandParentPosition
  );
  while (
    grandParent &&
    hasSubObjectives(grandParent) &&
    grandParent.subObjectives.length === parentPosition.at(-1)
  ) {
    parentPosition = grandParentPosition;
    grandParentPosition = parentPosition.slice(0, parentPosition.length - 1);

    grandParent =
      grandParentPosition.length > 0
        ? getNestedItem(list, grandParentPosition)
        : undefined;
  }
  if (grandParent && hasSubObjectives(grandParent)) {
    let nextPosition = [
      ...parentPosition.slice(0, parentPosition.length - 1),
      parentPosition.at(-1)! + 1,
    ];
    let next = grandParent.subObjectives[nextPosition.at(-1)!];
    while (hasSubObjectives(next)) {
      next = next.subObjectives[0];
      nextPosition.push(0);
    }
    return [next, nextPosition];
  }
}
/** Recursively iterates over list (and nested sub-lists),
 * mapping each item to its position and then flattening the result
 * @param list
 * @param [position=[]] used for recursive calls, this is the "starting contextual" position for the walk, and corresponds to the position of ``list`` in its parent collection */
export function walkObjectivePositions(
  list: Objective[],
  position: number[] = []
): ObjectivePosition[] {
  return list.flatMap((objective, i) => {
    const nestedPosition = [...position, i];
    return [
      nestedPosition,
      ...(!hasSubObjectives(objective)
        ? []
        : walkObjectivePositions(objective.subObjectives, nestedPosition)),
    ];
  });
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
        continue;
      }
      const stepPosition = [...nestedPosition, -1];
      for (let step of objective.steps) {
        stepPosition[stepPosition.length - 1] += 1;
        const condition = step[1];
        if (!Array.isArray(condition)) {
          for (let trigger of triggers) {
            if (trigger === condition) {
              // console.debug({ simpleTrigger: { trigger, condition, position, step, count, stepPosition, }, });
              triggered.push([...stepPosition]);
              break;
            }
          }
        } else {
          for (let trigger of triggers) {
            if (
              Array.isArray(trigger) &&
              trigger.length === condition.length &&
              trigger.every((element, index) => element === condition[index])
            ) {
              // console.debug({ complexTrigger: { trigger, condition, position, step, count, stepPosition, }, });
              triggered.push([...stepPosition]);
              break;
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
            const parentObjectivePosition = position.slice(
              0,
              position.length - 1
            );
            const parentObjective = getNestedItem(
              store.objectives,
              parentObjectivePosition
            );
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
            // handle steps with a defined count (ie the trigger needs to be seen [count] times)
            // by treating each seen occurrence as a (fictional/virtual) sub-step of the current step's position
            const stepCountForCompletion = hasSubObjectives(parentObjective)
              ? undefined
              : parentObjective.steps[position.at(-1)!]?.[2];
            if (stepCountForCompletion) {
              let completed = 1;
              let serialized: SerializedPosition;
              while (
                ((serialized = JSON.stringify([...position, completed])),
                state.progress.has(serialized))
              ) {
                completed += 1;
              }
              if (completed <= stepCountForCompletion) {
                state.progress.add(serialized);
                if (completed === stepCountForCompletion) {
                  // if this is the final count for this step, complete the entire step
                  state.progress.add(JSON.stringify(position));
                  // if this is the final step for this objective, complete the objective
                  if (
                    !hasSubObjectives(parentObjective) &&
                    position.at(-1) === parentObjective.steps.length - 1
                  ) {
                    state.progress.add(JSON.stringify(parentObjectivePosition));
                  }
                }
              }
            } else {
              // step has no defined count => trigger just needs to be seen once to complete step
              state.progress.add(JSON.stringify(position));
              // if we are the last child of our parent, complete it as well
              if (
                position.at(-1) ===
                (hasSubObjectives(parentObjective)
                  ? parentObjective.subObjectives
                  : parentObjective.steps
                ).length -
                  1
              ) {
                console.debug({
                  autoComplete: { position, parentObjectivePosition },
                });
                state.progress.add(JSON.stringify(parentObjectivePosition));
              }
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

export function debugProgress(
  progress: Set<SerializedPosition>,
  objectives: Objective[]
) {
  let debugProgress = [...progress].map((serializedPosition) => {
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
  console.debug({ debugProgress: new Map(debugProgress) });
}
