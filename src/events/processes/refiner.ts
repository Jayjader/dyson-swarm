import type { Event, Events } from "../events";
import {
  Construct,
  Resource,
  tickConsumption,
  tickProduction,
} from "../../gameStateStore";
import type { SubscriptionsFor } from "../index";
import type { EventProcessor } from "./index";

export type RefinerManager = EventProcessor<
  "refiner",
  {
    working: number;
    count: number;
    received: Events<
      Exclude<SubscriptionsFor<"refiner">, "simulation-clock-tick">
    >[];
  }
>;

export function createRefinerManager(
  options: Partial<{
    id: RefinerManager["id"];
    count: number;
  }> = {}
): RefinerManager {
  const values = {
    id: "refiner-0" as RefinerManager["id"],
    count: 0,
    ...options,
  };
  return {
    id: values.id,
    tag: "refiner",
    incoming: [],
    data: { working: values.count, count: values.count, received: [] },
  };
}

export function refinerProcess(
  refiner: RefinerManager
): [RefinerManager, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = refiner.incoming.shift())) {
    switch (event.tag) {
      case "command-set-working-count":
        if (event.construct === Construct.REFINER) {
          refiner.data.working = event.count;
          emitted.push({
            tag: "working-count-set",
            count: event.count,
            construct: Construct.REFINER,
            beforeTick: event.afterTick + 1,
          });
        }
        break;
      case "construct-fabricated":
        if (event.construct === Construct.REFINER) {
          refiner.data.received.push(event);
        }
        break;
      case "supply":
        if (event.toId === refiner.id) {
          refiner.data.received.push(event);
        }
        break;
      case "simulation-clock-tick": {
        const received = refiner.data.received.reduce(
          (sum, e) => {
            if (e.tag === "construct-fabricated") {
              sum.fabricated += 1;
            } else if (e.tag === "command-set-working-count") {
              sum.working = e.count;
            } else {
              sum[e.resource as Resource.ELECTRICITY | Resource.ORE] +=
                e.amount;
            }
            return sum;
          },
          {
            [Resource.ELECTRICITY]: 0,
            [Resource.ORE]: 0,
            fabricated: 0,
            working: null as null | number,
          }
        );
        refiner.data.working += received.fabricated;
        refiner.data.count += received.fabricated;
        if (received.working !== null) {
          refiner.data.working = received.working;
        }
        if (refiner.data.working > 0) {
          let enoughSupplied = true;
          refiner.data.received = [];
          const powerNeeded =
            refiner.data.working *
            tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!;
          if (received[Resource.ELECTRICITY] < powerNeeded) {
            enoughSupplied = false;
            emitted.push({
              tag: "draw",
              resource: Resource.ELECTRICITY,
              amount: powerNeeded - received[Resource.ELECTRICITY],
              forId: refiner.id,
              receivedTick: event.tick + 1,
            });
          }
          const oreNeeded =
            refiner.data.working *
            tickConsumption[Construct.REFINER].get(Resource.ORE)!;
          if (received[Resource.ORE] < oreNeeded) {
            enoughSupplied = false;
            emitted.push({
              tag: "draw",
              resource: Resource.ORE,
              amount: oreNeeded - received[Resource.ORE],
              forId: refiner.id,
              receivedTick: event.tick + 1,
            });
          }
          if (enoughSupplied) {
            const leftOverOre = received[Resource.ORE] - oreNeeded;
            if (leftOverOre > 0) {
              refiner.data.received = [
                {
                  tag: "supply",
                  resource: Resource.ORE,
                  amount: leftOverOre,
                  toId: refiner.id,
                  receivedTick: event.tick,
                },
              ];
            }
            emitted.push({
              tag: "produce",
              resource: Resource.METAL,
              amount:
                refiner.data.working *
                tickProduction[Construct.REFINER].get(Resource.METAL)!,
              receivedTick: event.tick + 1,
            });
          } else {
            for (const entry of Object.entries(received)) {
              const [resource, amount] = entry as [Resource, number];
              if (amount > 0) {
                refiner.data.received.push({
                  tag: "supply",
                  resource,
                  amount,
                  toId: refiner.id,
                  receivedTick: event.tick,
                });
              }
            }
          }
        }
      }
    }
  }
  return [refiner, emitted];
}
