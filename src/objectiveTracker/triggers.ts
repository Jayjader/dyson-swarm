import type { Construct } from "../gameRules";
import type { EventTag } from "../events/events";

export const CompleteIntroduction = Symbol("introduction dialog completed");
export const GuideOpened = Symbol("guide ui opened");
export const FabricatorOpened = Symbol("fabricator panel opened");
export const EditingQueue = Symbol("started editing fabricator build queue");
export const AddBuildOrder = Symbol(
  "inserted build order into the fabricator's build queue during editing"
);
export const AddRepeatOrder = Symbol(
  "inserted repeat build order into the fabricator's build queue during editing"
);
type RepeatCountTrigger = [number];
export type RepeatsTriggerWithContents = [
  ...RepeatCountTrigger,
  (Construct | RepeatsTriggerWithContents)[]
];
export type RepeatsTrigger = RepeatCountTrigger | RepeatsTriggerWithContents;
export type Trigger =
  | typeof GuideOpened
  | typeof CompleteIntroduction
  | typeof FabricatorOpened
  | typeof EditingQueue
  | typeof AddBuildOrder
  | [typeof AddBuildOrder, Construct]
  | [typeof AddRepeatOrder, RepeatsTrigger]
  | EventTag
  | [EventTag, ...unknown[]];

export function matchesTrigger(match: Trigger, trigger: Trigger): boolean {
  if (!(Array.isArray(match) || Array.isArray(trigger)) && match === trigger) {
    return true;
  }
  if (!(Array.isArray(match) && Array.isArray(trigger))) {
    return false;
  }
  const [matchType, matchContents] = match;
  const [triggerType, triggerContents] = trigger;
  if (typeof matchType === "string" && typeof triggerType === "string") {
    // event details
    return (
      match.length === trigger.length &&
      match.every(
        (coordinate, index) =>
          (trigger as [EventTag, ...unknown[]])[index] === coordinate
      )
    );
  }
  if (matchType === triggerType) {
    // symbols / other triggers
    if (matchType === AddBuildOrder) {
      return matchContents === triggerContents;
    }
    if (matchType === AddRepeatOrder) {
      const [matchRepeatCount, matchRepeatContents] = matchContents;
      if (matchRepeatContents === undefined) {
        // just matching on count for repeat for this step
        const [triggerCount] = triggerContents as RepeatsTrigger;
        return triggerCount >= matchRepeatCount;
      }
      // check presence of contents as well
      const [triggerRepeatCount, triggerRepeatContents] =
        triggerContents as RepeatsTrigger;
      return (
        /* allow triggering by repeats greater than the match repeat count */
        triggerRepeatCount >= matchRepeatCount &&
        triggerRepeatContents !== undefined &&
        containsMatchingRepeat(matchRepeatContents, triggerRepeatContents)
      );
    }
  }
  return false;
}

function containsMatchingRepeat(
  match: (Construct | RepeatsTriggerWithContents)[],
  trigger: (Construct | RepeatsTriggerWithContents)[]
): boolean {
  for (let [matchIndex, matchItem] of match.entries()) {
    const triggerItem = trigger[matchIndex];
    if (triggerItem === matchItem) {
      continue;
    }
    if (!(Array.isArray(triggerItem) && Array.isArray(matchItem))) {
      return false;
    }
    const [matchRepeatCount, matchRepeatContents] = matchItem;
    const [triggerRepeatCount, triggerRepeatContents] = triggerItem;
    if (
      matchRepeatCount > triggerRepeatCount ||
      !containsMatchingRepeat(matchRepeatContents, triggerRepeatContents)
    ) {
      return false;
    }
  }
  return true;
}
