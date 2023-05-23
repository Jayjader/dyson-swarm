import { isRepeat, type Repeat } from "../types";
import type { SerializedPosition, TrackedObjectives } from "./store";
import type { RepeatsTriggerWithContents, Trigger } from "./triggers";
import { FabricatorOpened, matchesTrigger } from "./triggers";

type ObjectiveCore = { title: string } & { autostart?: true | Trigger };
type NodeObjective = ObjectiveCore & { subObjectives: Objective[] };
type LeafObjective = ObjectiveCore & {
  details: (string | [string, Aside[]])[];
  steps: Step[];
};

export type Objective = NodeObjective | LeafObjective;
export type Step = [string, Trigger] | [string, Trigger, number];
export type Aside = [
  string,
  [string, string],
  [string, string],
  [string, string]
];

export function isNode(o: Objective): o is NodeObjective {
  return Array.isArray(
    (o as unknown as { subObjectives: Objective[] })?.subObjectives
  );
}
export function hasSubObjectives(
  o: Objective
): o is NodeObjective & { subObjectives: [Objective, ...Array<Objective>] } {
  return isNode(o) && o.subObjectives.length > 0;
}

export type ObjectivePosition = number[];

/**
 * Returns position of first "leaf" objective, i.e. the first (sub-)objective with concrete steps, in the list
 */
export function getPositionOfFirstItem(
  list: Objective[],
  position: ObjectivePosition = [0]
): ObjectivePosition {
  const element = getNestedItem(list, position);
  if (!isNode(element)) {
    return position;
  }
  return [...position, ...getPositionOfFirstItem(element.subObjectives)];
}

export function getNestedItem(
  list: Objective[],
  position: ObjectivePosition,
  enforceIsNode: true
): NodeObjective;
export function getNestedItem(
  list: Objective[],
  position: ObjectivePosition,
  enforceIsNode: false
): Objective;
export function getNestedItem(
  list: Objective[],
  position: ObjectivePosition,
  enforceIsNode?: boolean
): Objective;
export function getNestedItem(
  list: Objective[],
  position: ObjectivePosition,
  enforceIsNode: boolean = false
): Objective {
  let retVal: Objective;
  const [currentIndex, ...subCoordinates] = position;
  if (subCoordinates.length === 0) {
    retVal = list[currentIndex];
  } else {
    const currentObjective = list[currentIndex];
    if (hasSubObjectives(currentObjective)) {
      retVal = getNestedItem(
        currentObjective.subObjectives,
        subCoordinates,
        enforceIsNode
      );
    } else {
      console.warn(
        `Error in retrieving objective from list @${JSON.stringify(
          position
        )}. Using closest parent objective "${
          currentObjective.title
        }" as return value instead. This may have been caused by using the position of an objective step (or counter for a step) as the position of an actual objective.`
      );
      retVal = currentObjective;
    }
  }
  if (enforceIsNode && !isNode(retVal)) {
    throw new Error(
      `found objective @${JSON.stringify(
        position
      )} that has no sub-objectives: ${JSON.stringify(retVal)}`
    );
  }
  return retVal;
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
  const positions = recursivePositionWalk(list);
  if (position.length > 0) {
    const index = positions.findIndex((p) => areEqual(p, position));
    if (index > 0) {
      return positions.slice(index);
    }
  }
  return positions;
}
function recursivePositionWalk(
  list: Objective[],
  position: ObjectivePosition = []
): ObjectivePosition[] {
  return list.flatMap((objective, i) => {
    const nestedPosition: ObjectivePosition = [...position, i];
    return [
      nestedPosition,
      ...(!hasSubObjectives(objective)
        ? []
        : recursivePositionWalk(objective.subObjectives, nestedPosition)),
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
      ...(!isNode(objective)
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

function findCompleted(
  objectives: Objective[],
  trigger: Trigger,
  previous: Pick<TrackedObjectives, "started" | "completed">
) {
  const newlyCompleted = new Set<SerializedPosition>();
  for (let [position, objective] of walkObjectives(objectives)) {
    const serializedPosition = JSON.stringify(position);
    if (
      previous.started.has(serializedPosition) &&
      !(
        previous.completed.has(serializedPosition) ||
        newlyCompleted.has(serializedPosition)
      ) &&
      !isNode(objective)
    ) {
      let stepPosition: ObjectivePosition = [...position, -1];
      let stepSerialized;
      let stepComplete;
      for (let step of objective.steps) {
        stepPosition[stepPosition.length - 1] += 1;
        stepSerialized = JSON.stringify(stepPosition);
        if (!previous.started.has(stepSerialized)) {
          break; // next steps won't have started, so we can bail out of iterating over them entirely
        }
        if (
          previous.completed.has(stepSerialized) ||
          newlyCompleted.has(stepSerialized)
        ) {
          continue; // step already completed
        }
        stepComplete = false;
        const [_, triggerMatch, countForCompletion] = step;
        const matches = matchesTrigger(triggerMatch, trigger);
        if (trigger === FabricatorOpened) {
          console.debug({ triggerMatch, trigger, matches });
        }
        if (!matches) {
          break; // next steps won't have started, so we can bail out of iterating over them entirely
        }

        if (countForCompletion === undefined || countForCompletion < 2) {
          stepComplete = true;
        } else {
          let countPosition: ObjectivePosition = [...stepPosition, 0];
          let serializedCount: SerializedPosition;
          while (countPosition.at(-1)! <= countForCompletion) {
            countPosition[countPosition.length - 1] += 1;
            serializedCount = JSON.stringify(countPosition);
            if (
              !(
                previous.completed.has(serializedCount) ||
                newlyCompleted.has(serializedCount)
              )
            )
              break; // next count of completion for this step now present in countPosition/serializedCount
          }

          if (countPosition[countPosition.length - 1] <= countForCompletion) {
            newlyCompleted.add(serializedCount!);
            stepComplete =
              countPosition[countPosition.length - 1] === countForCompletion; // step is complete if count reached
          }
        }
        if (stepComplete) {
          newlyCompleted.add(stepSerialized);
        }
      }

      if (
        stepSerialized !== undefined &&
        newlyCompleted.has(stepSerialized) &&
        stepPosition.at(-1) === objective.steps.length - 1
      ) {
        // last step for objective is complete => each ancestor that is the last sub-objective of its parent is complete
        newlyCompleted.add(serializedPosition);
        let parentPosition: ObjectivePosition = position.slice();
        let indexOnParent, serializedParent;
        while (
          ((indexOnParent = parentPosition.pop()!), parentPosition.length > 0)
        ) {
          const parent = getNestedItem(objectives, parentPosition, true);
          if (indexOnParent < parent.subObjectives.length - 1) {
            break;
          }
          serializedParent = JSON.stringify(parentPosition);
          if (
            previous.completed.has(serializedParent) ||
            newlyCompleted.has(serializedParent)
          ) {
            break;
          }
          newlyCompleted.add(serializedParent);
        }
      }
    }
  }
  console.debug({ newlyCompleted });
  return newlyCompleted;
}
function findStartedFromCompleted(
  objectives: Objective[],
  newlyCompleted: Set<SerializedPosition>
) {
  const startedFromCompleted = new Set<SerializedPosition>();
  for (let [position, objective] of walkObjectives(objectives)) {
    const serializedPosition = JSON.stringify(position);
    const positionIndex = position.at(-1)!;
    if (
      newlyCompleted.has(
        JSON.stringify([
          ...position.slice(0, position.length - 1),
          positionIndex - 1,
        ])
      )
    ) {
      // previous sibling was just completed
      startedFromCompleted.add(serializedPosition);
      if (!isNode(objective)) {
        // start first step
        startedFromCompleted.add(JSON.stringify([...position, 0]));
      }
      continue;
    }
    if (!isNode(objective)) {
      for (
        let stepIndex = 1 /* skip index 0 because it never has a previous sibling */;
        stepIndex < objective.steps.length;
        stepIndex++
      ) {
        if (newlyCompleted.has(JSON.stringify([...position, stepIndex - 1]))) {
          // previous sibling was just completed
          startedFromCompleted.add(JSON.stringify([...position, stepIndex]));
        }
      }
    }
  }
  console.debug({ startedFromCompleted });
  return startedFromCompleted;
}
function propagateStartedFromCompleted(
  objectives: Objective[],
  startedFromCompleted: Set<SerializedPosition>
) {
  const startedFromCompletedPropagation = new Set<SerializedPosition>();
  for (let [position, objective] of walkObjectives(objectives)) {
    const serializedPosition = JSON.stringify(position);
    if (position.length > 1 && position.at(-1)! === 0) {
      // this is the first child of an objective
      const serializedParentPosition = JSON.stringify(
        position.slice(0, position.length - 1)
      );
      if (
        startedFromCompleted.has(serializedParentPosition) ||
        startedFromCompletedPropagation.has(serializedParentPosition)
      ) {
        // that parent objective is newly started => this starts as well
        startedFromCompletedPropagation.add(serializedPosition);
        if (!isNode(objective)) {
          // this has steps => start first step as well
          startedFromCompletedPropagation.add(JSON.stringify([...position, 0]));
        }
      }
    }
  }
  console.debug({ startedFromCompletedPropagation });
  return startedFromCompletedPropagation;
}
function findStartedFromTrigger(objectives: Objective[], trigger: Trigger) {
  const startedFromTrigger = new Set<SerializedPosition>();
  for (let [position, objective] of walkObjectives(objectives)) {
    if (
      objective.autostart !== undefined &&
      objective.autostart !== true &&
      matchesTrigger(objective.autostart, trigger)
    ) {
      startedFromTrigger.add(JSON.stringify(position));
      // start children
      if (isNode(objective)) {
        for (
          let childIndex = 0;
          childIndex < objective.subObjectives.length;
          childIndex++
        ) {
          startedFromTrigger.add(JSON.stringify([...position, childIndex]));
        }
      }
      // start direct ancestors
      let parentPosition = position.slice();
      while ((parentPosition.pop(), parentPosition.length > 0)) {
        startedFromTrigger.add(JSON.stringify(parentPosition));
      }
    }
  }
  console.debug({ startedFromTrigger });
  return startedFromTrigger;
}
export function propagateStartedFromTrigger(
  objectives: Objective[],
  startedFromTrigger: Set<SerializedPosition>
) {
  const startedFromTriggerPropagation = new Set<SerializedPosition>();
  for (let [position, objective] of walkObjectives(objectives)) {
    const serializedPosition = JSON.stringify(position);
    const positionIndex = position.at(-1)!;

    if (startedFromTrigger.has(serializedPosition) && !isNode(objective)) {
      const firstStepSerialized = JSON.stringify([...position, 0]);

      if (!startedFromTrigger.has(firstStepSerialized)) {
        startedFromTriggerPropagation.add(firstStepSerialized);
      }
      continue;
    }

    if (
      position.length > 1 &&
      positionIndex === 0 &&
      startedFromTrigger.has(
        JSON.stringify(position.slice(0, position.length - 1))
      )
    ) {
      // parent is started and this is its first child
      startedFromTriggerPropagation.add(serializedPosition);
      // start first step for this objective
      startedFromTriggerPropagation.add(JSON.stringify([...position, 0]));
    }
  }
  console.debug({ startedFromTriggerPropagation });
  return startedFromTriggerPropagation;
}

export function findTriggeredSteps(
  objectives: Objective[],
  trigger: Trigger,
  previous: Pick<TrackedObjectives, "started" | "completed">
) {
  const newlyCompleted = findCompleted(objectives, trigger, previous);
  const startedFromCompleted = findStartedFromCompleted(
    objectives,
    newlyCompleted
  );
  const startedFromCompletedPropagation = propagateStartedFromCompleted(
    objectives,
    startedFromCompleted
  );
  const startedFromTrigger = findStartedFromTrigger(objectives, trigger);
  const startedFromTriggerPropagation = propagateStartedFromTrigger(
    objectives,
    startedFromTrigger
  );

  return {
    started: new Set([
      ...previous.started,
      ...startedFromCompleted,
      ...startedFromCompletedPropagation,
      ...startedFromTrigger,
      ...startedFromTriggerPropagation,
    ]),
    completed: new Set([...previous.completed, ...newlyCompleted]),
  };

  /*
  const result = walkObjectives(objectives).reduce(
    (
      { started, completed, previousCompleted, previousStarted },
      [position, objective]
    ) => {
      const serializedPosition = JSON.stringify(position);
      if (!started.has(serializedPosition)) {
        // started if parent already started
        if (
          started.has(JSON.stringify(position.slice(0, position.length - 1)))
          // previousStarted !== undefined &&
          // position.length > previousStarted.length &&
          // previousStarted.every(
          //   (coordinate, index) => position[index] === coordinate
          // )
        ) {
          started.add(serializedPosition);
          return {
            started,
            completed,
            previousCompleted: false,
            previousStarted,
          };
        }

        // started if autoStart condition triggered
        if (
          objective?.autostart !== undefined &&
          objective.autostart !== true &&
          matchesTrigger(objective.autostart, trigger)
        ) {
          started.add(serializedPosition);
          let parent = position.slice(0, position.length - 1);
          // backwards propagate autoStart to ancestors
          do {
            console.debug({ autoStarts: [...parent] });
            started.add(JSON.stringify(parent));
          } while ((parent.pop(), parent.length > 0));
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

      // already completed => objective can be skipped
      if (completed.has(serializedPosition)) {
        return {
          completed,
          started,
          previousStarted,
          previousCompleted: false,
        };
      }

      // already started and not yet completed => objective can be completed

      if (hasSubObjectives(objective)) {
        // the order in which we are iterating prevents us from doing any meaningful checks here
        return {
          started,
          completed,
          previousCompleted: false,
          previousStarted,
        };
      }

      // check steps for completion
      const stepPosition = [...position, -1];
      let lastStepComplete;
      for (let step of objective.steps) {
        stepPosition[stepPosition.length - 1] += 1;
        const stepIndex = stepPosition.at(-1)!;

        if (completed.has(JSON.stringify(stepPosition))) {
          lastStepComplete = stepIndex;
          continue;
        }

        const [_, stepTrigger, stepCount] = step;
        if (
          !matchesTrigger(stepTrigger, trigger) ||
          (stepIndex > 1 && lastStepComplete !== stepIndex - 1)
        ) {
          break;
        }

        if (stepCount === undefined) {
          completed.add(JSON.stringify([...stepPosition]));
          lastStepComplete = stepPosition.at(-1);
          continue;
        }

        let countCompleted = 1,
          serialized;
        while (
          ((serialized = JSON.stringify([...stepPosition, countCompleted])),
          completed.has(serialized))
        ) {
          countCompleted += 1;
        }
        if (countCompleted > stepCount) {
          continue;
        }
        completed.add(JSON.stringify(serialized));
        if (countCompleted === stepCount) {
          completed.add(JSON.stringify(stepPosition));
          lastStepComplete = stepPosition.at(-1);
        }
      }

      // some steps incomplete => goto next in reducer
      if (
        lastStepComplete !== undefined &&
        lastStepComplete + 1 < objective.steps.length
      ) {
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
      ...previous,
      previousCompleted: false,
      previousStarted: undefined as undefined | ObjectivePosition,
    }
  );
  return { started: result.started, completed: result.completed };
  */
}

export function findAutoStartPositions(list: Objective[]): ObjectivePosition[] {
  // if the need arises to only find autostart positions at/after a certain position,
  // uncomment the following block and edit the final return statement to be `return positions;`
  /*
    const positions = autoStartWorker(list);
    if (position.length > 0) {
      const index = positions.findIndex((p) => isBefore(position, p));
      if (index > 0) {
        return positions.slice(index);
      }
    }
  */
  return autoStartWorker(list);
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
