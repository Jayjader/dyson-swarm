import { MERCURY_MASS_KG, Resource, tickProduction } from "../../gameRules";
import type { BusEvent, Events } from "../events";
import { compareReceivedTicks, indexOfFirstFutureEvent } from "../events";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";
import type { Adapters } from "../../adapters";

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
  options: Partial<{ id: Planet["core"]["id"]; mass: bigint }> = {},
): Planet {
  const values = {
    id: "planet-0" as Planet["core"]["id"],
    mass: MERCURY_MASS_KG,
    ...options,
  };
  return {
    core: {
      id: values.id,
      tag: "planet",
      lastTick: Number.NEGATIVE_INFINITY,
    },
    data: { mass: values.mass, received: [] },
  };
}

export function planetProcess(
  planet: Planet,
  inbox: BusEvent[],
): [Planet, BusEvent[]] {
  let event;
  const emitted = [] as BusEvent[];
  while ((event = inbox.shift())) {
    switch (event.tag) {
      case "mine-planet-surface":
        planet.data.received.push(event);
        break;
      case "simulation-clock-tick": {
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
  }
  return [planet, emitted];
}

export async function getPlanetMass(adapters: Adapters): Promise<bigint> {
  return (
    (
      (
        await adapters.snapshots.getLastSnapshot("planet-0")
      )[1] as Planet["data"]
    )?.mass ?? 0n
  );
}
