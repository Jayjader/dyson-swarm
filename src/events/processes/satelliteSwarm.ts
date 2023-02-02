import type { BusEvent, Events } from "../events";
import type { Simulation } from "../index";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";

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
  options: Partial<{ id: SatelliteSwarm["id"]; count: number }> = {}
): SatelliteSwarm {
  const values = {
    id: "swarm-0" as SatelliteSwarm["id"],
    count: 0,
    ...options,
  };
  return {
    id: values.id,
    tag: "swarm",
    incoming: [],
    data: { count: values.count, received: [] },
  };
}

export function swarmProcess(
  swarm: SatelliteSwarm
): [SatelliteSwarm, BusEvent[]] {
  let event,
    emitted = [] as BusEvent[];
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
              ? [launched + (e?.count ?? 1), flux /* flux||false === flux */]
              : [launched, true /* flux||true === true */],
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
export function swarmCount(simulation: Simulation): number {
  return (
    (simulation.processors?.get("swarm-0") as SatelliteSwarm)?.data.count ?? 0
  );
}
