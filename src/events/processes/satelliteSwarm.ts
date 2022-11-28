import type { EventProcessor } from "./index";
import type { Event, Events } from "../events";
import type { SubscriptionsFor } from "../index";

export type SatelliteSwarm = EventProcessor<
  "swarm",
  {
    count: number;
    received: Events<
      Exclude<SubscriptionsFor<"swarm">, "simulation-clock-tick">
    >[];
  }
>;
export function createSwarm(
  id: SatelliteSwarm["id"] = "swarm-0"
): SatelliteSwarm {
  return { id, tag: "swarm", incoming: [], data: { count: 0, received: [] } };
}

export function swarmProcess(swarm: SatelliteSwarm): [SatelliteSwarm, Event[]] {
  let event,
    emitted = [] as Event[];
  while ((event = swarm.incoming.shift())) {
    switch (event.tag) {
      case "launch-satellite":
        swarm.data.received.push(event);
        break;
      case "simulation-clock-tick":
        swarm.data.count += swarm.data.received.length;
        swarm.data.received = [];
        break;
    }
  }
  return [swarm, emitted];
}
