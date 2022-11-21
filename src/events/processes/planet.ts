import type { Event, Events } from "../events";
import type { SubscriptionsFor } from "../index";
import { Resource, tickProduction } from "../../gameStateStore";
import type { EventProcessor } from "./index";

export type Planet = EventProcessor<
  "planet",
  {
    mass: number;
    received: Events<
      Exclude<SubscriptionsFor<"planet">, "simulation-clock-tick">
    >[];
  }
>;

export function createPlanet(
  id: Planet["id"] = "planet-0",
  mass = 100
): Planet {
  return { id, tag: "planet", incoming: [], data: { mass, received: [] } };
}

export function planetProcess(planet: Planet): [Planet, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = planet.incoming.shift())) {
    switch (event.tag) {
      case "mine-planet-surface":
        planet.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const totalOreMined = Math.min(
          planet.data.mass, // we don't want to mine more ore than the planet has mass!
          planet.data.received.length * tickProduction.miner.get(Resource.ORE)!
        );
        if (totalOreMined > 0) {
          planet.data.mass -= totalOreMined;
          emitted.push({
            tag: "produce",
            resource: Resource.ORE,
            amount: totalOreMined,
            receivedTick: event.tick + 1,
          });
        }
        break;
    }
  }
  return [planet, emitted];
}
