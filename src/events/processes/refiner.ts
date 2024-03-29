import {
  Construct,
  Resource,
  tickConsumption,
  tickProduction,
} from "../../gameRules";
import type { BusEvent, Events } from "../events";
import type { Simulation } from "../index";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";

export type RefinerManager = EventProcessor<
  "refiner",
  {
    working: number;
    count: number;
    received: Events<
      Exclude<
        SubscriptionsFor<"refiner">,
        "simulation-clock-tick" | "command-set-working-count"
      >
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
): [RefinerManager, BusEvent[]] {
  let event: BusEvent;
  const emitted = [] as BusEvent[];
  while ((event = refiner.incoming.shift()!)) {
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
          if (event.amount <= 0n) {
            console.warn({
              warning: "supply event with amount <= 0 detected",
              event,
            });
            break;
          }
          refiner.data.received.push(event);
        }
        break;
      case "simulation-clock-tick": {
        const received = refiner.data.received.reduce(
          (sum, e) => {
            if (e.tag === "construct-fabricated") {
              sum.fabricated += 1;
            } else {
              sum[e.resource as Resource.ELECTRICITY | Resource.ORE] +=
                e.amount;
            }
            return sum;
          },
          {
            [Resource.ELECTRICITY]: 0n,
            [Resource.ORE]: 0n,
            fabricated: 0,
          }
        );
        refiner.data.received = [];

        if (received.fabricated > 0) {
          refiner.data.working += received.fabricated;
          refiner.data.count += received.fabricated;
        }
        if (refiner.data.working <= 0) {
          refiner.data.received.push(
            {
              tag: "supply",
              resource: Resource.ELECTRICITY,
              amount: received[Resource.ELECTRICITY],
              receivedTick: event.tick,
              toId: refiner.id,
            },
            {
              tag: "supply",
              resource: Resource.ORE,
              amount: received[Resource.ORE],
              receivedTick: event.tick,
              toId: refiner.id,
            }
          );
          break;
        }

        let enoughSupplied = true;

        const powerNeeded =
          BigInt(refiner.data.working) *
          BigInt(tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!);
        let powerDrawn = powerNeeded;
        if (received[Resource.ELECTRICITY] < powerNeeded) {
          enoughSupplied = false;
          powerDrawn -= received[Resource.ELECTRICITY];
        }
        emitted.push({
          tag: "draw",
          resource: Resource.ELECTRICITY,
          amount: powerDrawn,
          forId: refiner.id,
          receivedTick: event.tick + 1,
        });

        const oreNeeded =
          BigInt(refiner.data.working) *
          BigInt(tickConsumption[Construct.REFINER].get(Resource.ORE)!);
        const projectedOrePostProduction = received[Resource.ORE] - oreNeeded;
        let oreToDrawFromStorageForNextTick = oreNeeded;
        if (projectedOrePostProduction < 0n) {
          enoughSupplied = false;
          oreToDrawFromStorageForNextTick -= received[Resource.ORE];
        } else if (projectedOrePostProduction > 0n) {
          oreToDrawFromStorageForNextTick -= projectedOrePostProduction;
        }
        if (oreToDrawFromStorageForNextTick > 0n) {
          emitted.push({
            tag: "draw",
            resource: Resource.ORE,
            amount: oreToDrawFromStorageForNextTick,
            forId: refiner.id,
            receivedTick: event.tick + 1,
          });
        }

        if (!enoughSupplied) {
          for (let resource of [Resource.ELECTRICITY, Resource.ORE] as const) {
            const amount = received[resource];
            if (amount > 0) {
              refiner.data.received.push({
                tag: "supply",
                resource,
                amount,
                toId: refiner.id,
                receivedTick: (event as Events<"simulation-clock-tick">).tick,
              });
            }
          }
          break;
        }
        if (projectedOrePostProduction > 0n) {
          refiner.data.received = [
            {
              tag: "supply",
              resource: Resource.ORE,
              amount: projectedOrePostProduction,
              toId: refiner.id,
              receivedTick: event.tick,
            },
          ];
        }
        emitted.push({
          tag: "produce",
          resource: Resource.METAL,
          amount:
            BigInt(refiner.data.working) *
            tickProduction[Construct.REFINER].get(Resource.METAL)!,
          receivedTick: event.tick + 1,
        });
      }
    }
  }
  return [refiner, emitted];
}

export function getRefiners(simulation: Simulation) {
  const { count, working } = (
    simulation.processors.get("refiner-0") as RefinerManager | undefined
  )?.data ?? { count: 0, working: 0 };
  return { count, working };
}
