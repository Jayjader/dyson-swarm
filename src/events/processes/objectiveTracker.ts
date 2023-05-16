import type { EventProcessor } from "./index";
import type { BusEvent } from "../events";
import type { ObjectivePosition, Trigger } from "../../objectiveTracker/store";

export type ObjectiveTrackerProbe = EventProcessor<
  "probe",
  { propagateTriggers: (triggers: Trigger[]) => void }
>;

export function createObjectiveTrackerProbe(
  propagateTriggers: (triggers: Trigger[]) => void,
  id: ObjectiveTrackerProbe["id"] = "probe-0"
): ObjectiveTrackerProbe {
  return {
    id,
    tag: "probe",
    incoming: [],
    data: {
      propagateTriggers,
    },
  };
}

export function objectiveTrackerProcess(
  probe: ObjectiveTrackerProbe
): [ObjectiveTrackerProbe, BusEvent[]] {
  const emitted = [] as BusEvent[];

  let event;
  while ((event = probe.incoming.shift())) {
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
