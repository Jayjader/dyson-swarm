import {
  Construct,
  Resource,
  tickConsumption,
  tickProduction,
} from "../../gameRules";
import type { BusEvent, Events } from "../events";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";
import type { Adapters } from "../../adapters";

export type SatelliteFactoryManager = EventProcessor<
  "factory",
  {
    count: number;
    working: number;
    received: Events<
      Exclude<SubscriptionsFor<"factory">, "simulation-clock-tick">
    >[];
  }
>;
export function createFactoryManager(
  options: Partial<{
    id: SatelliteFactoryManager["core"]["id"];
    count: number;
  }> = {},
): SatelliteFactoryManager {
  const values = {
    id: "factory-0" as SatelliteFactoryManager["core"]["id"],
    count: 0,
    ...options,
  };
  return {
    core: {
      id: values.id,
      tag: "factory",
      lastTick: Number.NEGATIVE_INFINITY,
    },
    data: { count: values.count, working: values.count, received: [] },
  };
}
export function factoryProcess(
  factory: SatelliteFactoryManager,
  inbox: BusEvent[],
): [SatelliteFactoryManager, BusEvent[]] {
  let event: BusEvent;
  const emitted = [] as BusEvent[];
  while ((event = inbox.shift()!)) {
    switch (event.tag) {
      case "command-set-working-count":
        if (event.construct === Construct.SATELLITE_FACTORY) {
          factory.data.working = event.count;
          emitted.push({
            tag: "working-count-set",
            count: event.count,
            construct: Construct.SATELLITE_FACTORY,
            beforeTick: event.afterTick + 1,
          });
        }
        break;
      case "construct-fabricated":
        if (event.construct === Construct.SATELLITE_FACTORY) {
          factory.data.received.push(event);
        }
        break;
      case "supply":
        if (event.toId === factory.core.id) {
          factory.data.received.push(event);
        }
        break;
      case "simulation-clock-tick": {
        const received = factory.data.received.reduce(
          (sum, e) => {
            if (e.tag === "construct-fabricated") {
              sum.fabricated += 1;
            } else if (e.tag === "command-set-working-count") {
              sum.working = e.count;
            } else {
              sum[e.resource as Resource.ELECTRICITY | Resource.METAL] +=
                e.amount;
            }
            return sum;
          },
          {
            [Resource.ELECTRICITY]: 0n,
            [Resource.METAL]: 0n,
            fabricated: 0,
            working: null as null | number,
          },
        );
        factory.data.received = [];
        if (received.fabricated > 0) {
          factory.data.working += received.fabricated;
          factory.data.count += received.fabricated;
        }
        if (received.working !== null) {
          factory.data.working = received.working;
        }
        if (factory.data.working <= 0) {
          factory.data.received.push(
            {
              tag: "supply",
              resource: Resource.ELECTRICITY,
              amount: received[Resource.ELECTRICITY],
              receivedTick: event.tick,
              toId: factory.core.id,
            },
            {
              tag: "supply",
              resource: Resource.METAL,
              amount: received[Resource.METAL],
              receivedTick: event.tick,
              toId: factory.core.id,
            },
          );
          break;
        }

        let enoughSupplied = true;

        const powerNeeded =
          BigInt(factory.data.working) *
          BigInt(tickConsumption.factory.get(Resource.ELECTRICITY)!);
        if (received[Resource.ELECTRICITY] < powerNeeded) {
          enoughSupplied = false;
          emitted.push({
            tag: "draw",
            resource: Resource.ELECTRICITY,
            amount: powerNeeded - received[Resource.ELECTRICITY],
            forId: factory.core.id,
            receivedTick: event.tick + 1,
          });
        }
        const metalNeeded =
          BigInt(factory.data.working) *
          BigInt(tickConsumption.factory.get(Resource.METAL)!);
        if (received[Resource.METAL] < metalNeeded) {
          enoughSupplied = false;
          emitted.push({
            tag: "draw",
            resource: Resource.METAL,
            amount: metalNeeded - received[Resource.METAL],
            forId: factory.core.id,
            receivedTick: event.tick + 1,
          });
        }
        if (!enoughSupplied) {
          ([Resource.ELECTRICITY, Resource.METAL] as const).forEach(
            (resource) => {
              const amount = received[resource];
              if (amount > 0) {
                factory.data.received.push({
                  tag: "supply",
                  resource,
                  amount,
                  toId: factory.core.id,
                  receivedTick: (event as Events<"simulation-clock-tick">).tick,
                });
              }
            },
          );
          break;
        }
        const metalLeftOver = received[Resource.METAL] - metalNeeded;
        if (metalLeftOver > 0) {
          factory.data.received = [
            {
              tag: "supply",
              resource: Resource.METAL,
              amount: metalLeftOver,
              toId: factory.core.id,
              receivedTick: event.tick,
            },
          ];
        }
        emitted.push({
          tag: "produce",
          resource: Resource.PACKAGED_SATELLITE,
          amount:
            BigInt(factory.data.working) *
            tickProduction.factory.get(Resource.PACKAGED_SATELLITE)!,
          receivedTick: event.tick + 1,
        });
      }
    }
  }
  return [factory, emitted];
}

export async function getSatelliteFactoryStats(adapters: Adapters) {
  const { count, working } = ((
    await adapters.snapshots.getLastSnapshot("factory-0")
  )[1] as SatelliteFactoryManager["data"]) ?? { count: 0, working: 0 };
  return { count, working };
}
