import type { EventProcessor } from "./index";
import type { BusEvent } from "../events";

import type { Trigger } from "../../objectiveTracker/triggers";

export type ObjectiveTrackerProbe = EventProcessor<
  "probe",
  { propagateTriggers: (triggers: Trigger[]) => void }
>;

export function createObjectiveTrackerProbe(
  propagateTriggers: (triggers: Trigger[]) => void,
  id: ObjectiveTrackerProbe["core"]["id"] = "probe-0",
): ObjectiveTrackerProbe {
  return {
    core: {
      id,
      tag: "probe",
      lastTick: Number.NEGATIVE_INFINITY,
    },
    data: {
      propagateTriggers,
    },
  };
}

export function objectiveTrackerProcess(
  probe: ObjectiveTrackerProbe,
  inbox: BusEvent[],
): [ObjectiveTrackerProbe, BusEvent[]] {
  const emitted = [] as BusEvent[];

  let event;
  while ((event = inbox.shift())) {
    switch (event.tag) {
      case "command-set-fabricator-queue":
        probe.data.propagateTriggers([event.tag]);
        break;
      case "construct-fabricated":
        probe.data.propagateTriggers([[event.tag, event.construct]]);
        break;
    }
  }
  return [probe, emitted];
}
