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
    id: RefinerManager["core"]["id"];
    count: number;
  }> = {},
): RefinerManager {
  const values = {
    id: "refiner-0" as RefinerManager["core"]["id"],
    count: 0,
    ...options,
  };
  return {
    core: {
      id: values.id,
      tag: "refiner",
      lastTick: Number.NEGATIVE_INFINITY,
    },
    data: { working: values.count, count: values.count, received: [] },
  };
}

export function refinerProcess(
  refiner: RefinerManager,
  inbox: BusEvent[],
): [RefinerManager, BusEvent[]] {
  let event: BusEvent;
  const emitted = [] as BusEvent[];
  while ((event = inbox.shift()!)) {
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
        if (event.toId === refiner.core.id) {
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
          },
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
              toId: refiner.core.id,
            },
            {
              tag: "supply",
              resource: Resource.ORE,
              amount: received[Resource.ORE],
              receivedTick: event.tick,
              toId: refiner.core.id,
            },
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
          forId: refiner.core.id,
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
            forId: refiner.core.id,
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
                toId: refiner.core.id,
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
              toId: refiner.core.id,
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

export async function getRefinerStats(
  adapters: Adapters,
): Promise<Omit<RefinerManager["data"], "received">> {
  const { count, working } = (
    (await adapters.snapshots.getLastSnapshot("refiner-0")) as RefinerManager
  )?.data ?? { count: 0, working: 0 };
  return { count, working };
}
