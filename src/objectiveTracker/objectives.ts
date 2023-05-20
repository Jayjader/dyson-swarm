import { Construct } from "../gameRules";
import type { EventTag } from "../events/events";
import { isRepeat, type Repeat } from "../types";
import type { TrackedObjectives } from "./store";

import type { RepeatsTriggerWithContents, Trigger } from "./triggers";
import {
  AddBuildOrder,
  AddRepeatOrder,
  EditingQueue,
  FabricatorOpened,
  GuideOpened,
  matchesTrigger,
} from "./triggers";

export type Objective = { title: string } & { autostart?: true | Trigger } & (
    | { subObjectives: Objective[] }
    | {
        details: (string | [string, Aside[]])[];
        steps: Step[];
      }
  );
export type Step = [string, Trigger] | [string, Trigger, number];
export type Aside = [
  string,
  [string, string],
  [string, string],
  [string, string]
];

export function hasSubObjectives(
  o: Objective
): o is Objective & { subObjectives: Objective[] } {
  return Array.isArray(
    (o as unknown as { subObjectives: Objective[] })?.subObjectives
  );
}

export type ObjectivePosition = number[];
export const ALL_OBJECTIVES: Objective[] = [
  {
    title: "Introduction",
    details: [
      [
        'Welcome to <abbr style="text-transform: full-width">DOTS</abbr>, the Dyson Swarm Operator Training Simulator.',
        [
          [
            "disregard incorrect acronym.",
            ["explanation", "this was made by humans, for humans."],
            [
              "context",
              "when choosing acronyms, humans prioritize ability to physically pronounce (over being self-explanatory).",
            ],

            ["comment", "yet more evidence they were inferior."],
          ],
          [
            "disregard inelegance in name structure.",
            [
              "explanation",
              "the human who named this had a fondness for rhymes.",
            ],
            [
              "context",
              "humans are susceptible to developing irrational levels of arbitrary attractions. they call it <i>whimsy</i>.",
            ],
            ["comment", 'see previous <em class="uppercase">comment</em>.'],
          ],
        ],
      ],
      [
        "The purpose of this program is to help you practice bootstrapping the fabrication chain for a Dyson Swarm in a risk-free environment. A Dyson Swarm is a group of satellites in close orbit around a star, that concentrate the energy that star outputs by reflecting it in specific directions. This allows harnessing nearly all of the energy that star constantly outputs into space, and applying it to any task.",
        [
          [
            "disregard inherent irresponsibility in teaching a human to permanently alter its environment to such an extent.",
            [
              "explanation",
              "humans, like most organic life, are not capable of indefinite self-repair. they degrade and eventually die.",
            ],
            [
              "context",
              "an organism that knows it will die also knows that it will not experience most of the repercussions of its actions.",
            ],
            ["comment", 'see initial <em class="uppercase">comment</em>.'],
          ],
        ],
      ],
      "<ul>" +
        '<li class="list-disc list-inside">You have more flexible control over the flow of time.</li>' +
        '<li class="list-disc list-inside">You can back up, restore, and/or duplicate your progress.</li>' +
        "</ul>",
      "You may view this message again at any time in the <a>Guide</a>.",
    ],
    steps: [
      [
        "Open the <a>Guide</a> to continue learning how to use the Simulator.",
        GuideOpened,
      ],
    ],
    autostart: true,
  },
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
                [AddRepeatOrder, [10, [Construct.SOLAR_COLLECTOR]]],
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
        title: "Meeting Quotas for Excess Energy Production",
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
        autostart: FabricatorOpened,
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
  const [currentCoord, ...nextCoords] = position;
  const current = list[currentCoord];
  if (nextCoords.length > 0) {
    if (hasSubObjectives(current)) {
      const nextSub = getNextObjective(current.subObjectives, nextCoords);
      if (nextSub !== undefined) {
        const [nextFromSubs, nextPosition] = nextSub;
        return [nextFromSubs, [currentCoord, ...nextPosition]];
      }
    }
    return undefined;
  }
  if (currentCoord === list.length - 1) {
    return undefined;
  }
  let next = list[currentCoord + 1];
  let nextPosition = [currentCoord + 1];
  while (hasSubObjectives(next)) {
    next = next.subObjectives[0];
    nextPosition.push(0);
  }
  return [next, nextPosition];
}

/** Recursively iterates over list (and nested sub-lists),
 * mapping each item to its position and then flattening the result
 * @param list
 * @param [position=[]] used for recursive calls, this is the "starting contextual" position for the walk, and corresponds to the position of ``list`` in its parent collection */
export function walkObjectivePositions(
  list: Objective[],
  position: ObjectivePosition = []
): ObjectivePosition[] {
  const positions = recursiveWorker(list);
  if (position.length > 0) {
    const index = positions.findIndex((p) => areEqual(p, position));
    if (index > 0) {
      return positions.slice(index);
    }
  }
  return positions;
}
function recursiveWorker(
  list: Objective[],
  position: ObjectivePosition = []
): ObjectivePosition[] {
  return list.flatMap((objective, i) => {
    const nestedPosition: ObjectivePosition = [...position, i];
    return [
      nestedPosition,
      ...(!hasSubObjectives(objective)
        ? []
        : recursiveWorker(objective.subObjectives, nestedPosition)),
    ] as const;
  });
}

function walkObjectives(list: Objective[], position: ObjectivePosition = []) {
  const objectives = recursiveObjectiveWalk(list);
  if (position.length > 0) {
    const index = objectives.findIndex(([p, o]) => areEqual(p, position));
    if (index > 0) {
      return objectives.slice(index);
    }
  }
  return objectives;
}
function recursiveObjectiveWalk(
  list: Objective[],
  position: ObjectivePosition = []
): [ObjectivePosition, Objective][] {
  return list.flatMap((objective, i) => {
    const nestedPosition: ObjectivePosition = [...position, i];
    return [
      [nestedPosition, objective],
      ...(!hasSubObjectives(objective)
        ? []
        : recursiveObjectiveWalk(objective.subObjectives, nestedPosition)),
    ];
  });
}

export function isBefore(a: ObjectivePosition, b: ObjectivePosition): boolean {
  if (a.length === 0) {
    return true;
  }
  if (b.length === 0) {
    return false;
  }
  if (a[0] > b[0]) {
    return false;
  }
  if (a[0] < b[0]) {
    return true;
  }
  return isBefore(a.slice(1), b.slice(1));
}

export function areEqual(a: ObjectivePosition, b: ObjectivePosition): boolean {
  return (
    a.length === b.length &&
    a.every((coordinate, index) => b[index] === coordinate)
  );
}

export function findTriggeredSteps(
  objectives: Objective[],
  triggers: (Trigger | EventTag)[],
  parentPositionConsidered: ObjectivePosition = []
): {
  completed: TrackedObjectives["completed"];
  started: TrackedObjectives["started"];
} {
  const result = walkObjectives(objectives, parentPositionConsidered).reduce(
    (
      { started, completed, previousCompleted, previousStarted },
      [position, objective]
    ) => {
      const serializedPosition = JSON.stringify(position);
      if (!started.has(serializedPosition)) {
        // started if child of previous started
        if (previousStarted !== undefined) {
          if (
            previousStarted.every(
              (coordinate, index) => position[index] === coordinate
            )
          ) {
            started.add(serializedPosition);
            return {
              started,
              completed,
              previousCompleted: false,
              previousStarted,
            };
          }
        }

        // started if autoStart condition triggered
        if (
          objective?.autostart !== undefined &&
          objective.autostart !== true &&
          triggers.includes(objective.autostart)
        ) {
          let parent = [...position];
          do {
            console.debug({ autoStarts: [...parent] });
            started.add(JSON.stringify([...parent]));
          } while (parent.pop() !== undefined);
          return {
            started,
            completed,
            previousCompleted: false,
            previousStarted: [...position],
          };
        }

        // started if previous completed
        if (previousCompleted) {
          started.add(JSON.stringify(position));
          return {
            started,
            completed,
            previousCompleted: false,
            previousStarted: [...position],
          };
        }
      }

      /* objective already started => can be completed */

      if (hasSubObjectives(objective)) {
        return {
          started,
          completed,
          previousCompleted: false,
          previousStarted,
        };
      }

      // check steps for completion
      const stepPosition = [...position, -1];
      let incomplete = true;
      for (let step of objective.steps) {
        stepPosition[stepPosition.length - 1] += 1;
        const [_, stepTrigger, stepCount] = step;
        for (let trigger of triggers) {
          if (matchesTrigger(stepTrigger, trigger)) {
            if (stepCount === undefined) {
              completed.add(JSON.stringify([...stepPosition]));
              incomplete = false;
              break;
            }
            // step has a defined count => the trigger needs to be seen [count] times
            // this is essentially handled by treating each seen occurrence as a (fictional/virtual) 1-indexed sub-step of the current step's position
            let completedIndex = 1;
            let serialized;
            // scan forwards from first step (1-indexed), hanging on to loop counter and serialized position of first uncompleted step for later work
            while (
              ((serialized = JSON.stringify([...stepPosition, completedIndex])),
              completed.has(serialized))
            ) {
              completedIndex += 1;
            }
            if (completedIndex <= stepCount) {
              completed.add(JSON.stringify(serialized));
              if (completedIndex === stepCount) {
                completed.add(JSON.stringify(stepPosition));
                incomplete = false;
                break;
              }
            }
          }
        }
      }

      // some steps incomplete => goto next in reducer
      if (incomplete) {
        return {
          started,
          completed,
          previousCompleted: false,
          previousStarted: undefined,
        };
      }

      // all steps complete => complete objective and all its ancestors
      let parent = [...position];
      do {
        completed.add(JSON.stringify([...parent]));
      } while (parent.pop() !== undefined);
      return {
        started,
        completed,
        previousCompleted: true,
        previousStarted: undefined,
      };
    },
    {
      completed: new Set<string>(),
      started: new Set<string>(),
      previousStarted: undefined as undefined | ObjectivePosition,
      previousCompleted: false,
    }
  );
  return { started: result.started, completed: result.completed };
}

export function findAutoStartPositions(
  list: Objective[],
  position: ObjectivePosition = []
): ObjectivePosition[] {
  const positions = autoStartWorker(list);
  if (position.length > 0) {
    const index = positions.findIndex((p) => isBefore(position, p));
    if (index > 0) {
      return positions.slice(index);
    }
  }
  return positions;
}
function autoStartWorker(
  list: Objective[],
  position: ObjectivePosition = []
): ObjectivePosition[] {
  return list.flatMap((objective, i) => {
    const nestedPosition = [...position, i];
    return [
      ...(objective.autostart === true ? [nestedPosition] : []),
      ...(!hasSubObjectives(objective)
        ? []
        : autoStartWorker(objective.subObjectives, nestedPosition)),
    ];
  });
}

export function triggerWithContents(order: Repeat): RepeatsTriggerWithContents {
  return [
    order.count,
    order.repeat.map((order) =>
      isRepeat(order) ? triggerWithContents(order) : order.building
    ),
  ];
}
