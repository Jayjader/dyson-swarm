import { Resource, tickProduction } from "../../gameRules";
import type { BusEvent, Events } from "../events";
import type { Simulation } from "../index";
import type { SubscriptionsFor } from "../subscriptions";
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
  options: Partial<{ id: Planet["id"]; mass: number }> = {}
): Planet {
  const values = {
    id: "planet-0" as Planet["id"],
    mass: 3.301e23,
    ...options,
  };
  return {
    id: values.id,
    tag: "planet",
    incoming: [],
    data: { mass: values.mass, received: [] },
  };
}

export function planetProcess(planet: Planet): [Planet, BusEvent[]] {
  let event;
  const emitted = [] as BusEvent[];
  while ((event = planet.incoming.shift())) {
    switch (event.tag) {
      case "mine-planet-surface":
        planet.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const totalOreMined = Math.min(
          planet.data.mass, // we don't want to mine more ore than the planet has mass!
          planet.data.received.reduce((accu, e) => accu + e.minerCount, 0) *
            tickProduction.miner.get(Resource.ORE)!
        );
        planet.data.received = [];
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

export function getPlanetMass(simulation: Simulation) {
  return (
    (simulation.processors.get("planet-0") as Planet | undefined)?.data.mass ??
    0
  );
}
