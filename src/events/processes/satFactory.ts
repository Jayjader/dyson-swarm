import type { Event, Events } from "../events";
import type { EventProcessor } from "./index";
import type { Simulation, SubscriptionsFor } from "../index";
import {
  Construct,
  Resource,
  tickConsumption,
  tickProduction,
} from "../../gameStateStore";

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
  options: Partial<{ id: SatelliteFactoryManager["id"]; count: number }> = {}
): SatelliteFactoryManager {
  const values = {
    id: "factory-0" as SatelliteFactoryManager["id"],
    count: 0,
    ...options,
  };
  return {
    id: values.id,
    tag: "factory",
    incoming: [],
    data: { count: values.count, working: values.count, received: [] },
  };
}
export function factoryProcess(
  factory: SatelliteFactoryManager
): [SatelliteFactoryManager, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = factory.incoming.shift())) {
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
        if (event.toId === factory.id) {
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
            [Resource.ELECTRICITY]: 0,
            [Resource.METAL]: 0,
            fabricated: 0,
            working: null as null | number,
          }
        );
        factory.data.working += received.fabricated;
        factory.data.count += received.fabricated;
        if (received.working !== null) {
          factory.data.working = received.working;
        }
        if (factory.data.working > 0) {
          let enoughSupplied = true;
          factory.data.received = [];
          const powerNeeded =
            factory.data.working *
            tickConsumption.factory.get(Resource.ELECTRICITY)!;
          if (received[Resource.ELECTRICITY] < powerNeeded) {
            enoughSupplied = false;
            emitted.push({
              tag: "draw",
              resource: Resource.ELECTRICITY,
              amount: powerNeeded - received[Resource.ELECTRICITY],
              forId: factory.id,
              receivedTick: event.tick + 1,
            });
          }
          const metalNeeded =
            factory.data.working * tickConsumption.factory.get(Resource.METAL)!;
          if (received[Resource.METAL] < metalNeeded) {
            enoughSupplied = false;
            emitted.push({
              tag: "draw",
              resource: Resource.METAL,
              amount: metalNeeded - received[Resource.METAL],
              forId: factory.id,
              receivedTick: event.tick + 1,
            });
          }
          if (enoughSupplied) {
            const metalLeftOver = received[Resource.METAL] - metalNeeded;
            if (metalLeftOver > 0) {
              factory.data.received = [
                {
                  tag: "supply",
                  resource: Resource.METAL,
                  amount: metalLeftOver,
                  toId: factory.id,
                  receivedTick: event.tick,
                },
              ];
            }
            emitted.push({
              tag: "produce",
              resource: Resource.PACKAGED_SATELLITE,
              amount:
                factory.data.working *
                tickProduction.factory.get(Resource.PACKAGED_SATELLITE)!,
              receivedTick: event.tick + 1,
            });
          } else {
            for (const entry of Object.entries(received)) {
              const [resource, amount] = entry as [Resource, number];
              if (amount > 0) {
                factory.data.received.push({
                  tag: "supply",
                  resource,
                  amount,
                  toId: factory.id,
                  receivedTick: event.tick,
                });
              }
            }
          }
        }
      }
    }
  }
  return [factory, emitted];
}

export function getFactories(simulation: Simulation) {
  const { count, working } = (
    simulation.processors.get("factory-0") as
      | SatelliteFactoryManager
      | undefined
  )?.data ?? { count: 0, working: 0 };
  return { count, working };
}
