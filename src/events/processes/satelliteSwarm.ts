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
      case "star-flux-emission":
      case "launch-satellite":
        swarm.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const [launched, flux] = swarm.data.received.reduce(
          ([launched, flux], e) =>
            e.tag === "launch-satellite"
              ? [launched + 1, flux]
              : [launched, true],
          [0, false]
        );
        swarm.data.count += launched;
        if (flux) {
          emitted.push({
            tag: "satellite-flux-reflection",
            flux: swarm.data.count,
            receivedTick: event.tick + 1,
          });
        }
        swarm.data.received = [];
        break;
    }
  }
  return [swarm, emitted];
}
