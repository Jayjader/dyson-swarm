import { MERCURY_MASS_KG, Resource, tickProduction } from "../../gameRules";
import type { BusEvent, Events } from "../events";
import type { Simulation } from "../index";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";
import { compareReceivedTicks, indexOfFirstFutureEvent } from "../events";

export type Planet = EventProcessor<
  "planet",
  {
    mass: bigint;
    received: Events<
      Exclude<SubscriptionsFor<"planet">, "simulation-clock-tick">
    >[];
  }
>;

export function createPlanet(
  options: Partial<{ id: Planet["id"]; mass: bigint }> = {}
): Planet {
  const values = {
    id: "planet-0" as Planet["id"],
    mass: MERCURY_MASS_KG,
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
        planet.data.received.sort(compareReceivedTicks);

        const { tick } = event;
        const futureIndex = indexOfFirstFutureEvent(planet.data.received, tick);

        const totalOreMiningPotential =
          tickProduction.miner.get(Resource.ORE)! *
          planet.data.received
            .slice(0, futureIndex)
            .reduce((accu, e) => accu + BigInt(e.minerCount), 0n);
        const totalOreMined =
          planet.data.mass < totalOreMiningPotential
            ? planet.data.mass
            : totalOreMiningPotential; // we don't want to mine **more** ore than the planet has mass!
        if (totalOreMined > 0) {
          planet.data.mass -= totalOreMined;
          emitted.push({
            tag: "produce",
            resource: Resource.ORE,
            amount: totalOreMined,
            receivedTick: event.tick + 1,
          });
        }

        planet.data.received =
          futureIndex === undefined
            ? []
            : planet.data.received.slice(futureIndex);
        break;
    }
  }
  return [planet, emitted];
}

export function getPlanetMass(simulation: Simulation): bigint {
  return (
    (simulation.processors.get("planet-0") as Planet | undefined)?.data.mass ??
    0n
  );
}
