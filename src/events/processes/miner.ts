import { Construct, Resource, tickConsumption } from "../../gameRules";
import type { BusEvent, Events } from "../events";
import type { Simulation } from "../index";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";

export type MinerManager = EventProcessor<
  "miner",
  {
    working: number;
    count: number;
    received: Events<
      Exclude<SubscriptionsFor<"miner">, "simulation-clock-tick">
    >[];
  }
>;

export function createMinerManager(
  options: Partial<{ id: MinerManager["core"]["id"]; count: number }> = {},
): MinerManager {
  const values = {
    id: "miner-0" as MinerManager["core"]["id"],
    count: 0,
    ...options,
  };
  return {
    core: {
      id: values.id,
      tag: "miner",
      lastTick: Number.NEGATIVE_INFINITY,
    },
    data: {
      working: values.count,
      count: values.count,
      received: [],
    },
  };
}

export function minerProcess(
  miner: MinerManager,
  inbox: BusEvent[],
): [MinerManager, BusEvent[]] {
  let event;
  const emitted = [] as BusEvent[];
  while ((event = inbox.shift())) {
    switch (event.tag) {
      case "command-set-working-count":
        if (event.construct === Construct.MINER) {
          miner.data.working = event.count;
          emitted.push({
            tag: "working-count-set",
            count: event.count,
            construct: Construct.MINER,
            beforeTick: event.afterTick + 1,
          });
        }
        break;
      case "construct-fabricated":
        if (event.construct === Construct.MINER) {
          miner.data.received.push(event);
        }
        break;
      case "supply":
        if (event.toId === miner.core.id) {
          miner.data.received.push(event);
        }
        break;
      case "simulation-clock-tick":
        const received = miner.data.received.reduce(
          (sum, e) => {
            if (e.tag === "construct-fabricated") {
              sum.fabricated += 1;
            } else if (e.tag === "command-set-working-count") {
              sum.working = e.count;
            } else {
              sum[Resource.ELECTRICITY] += e.amount;
            }
            return sum;
          },
          {
            [Resource.ELECTRICITY]: 0n,
            fabricated: 0,
            working: null as null | number,
          },
        );
        miner.data.count += received.fabricated;
        miner.data.working += received.fabricated;
        if (received.working !== null) {
          miner.data.working = received.working;
        }
        if (miner.data.working > 0) {
          miner.data.received = [];
          const powerNeeded =
            BigInt(miner.data.working) *
            BigInt(tickConsumption.miner.get(Resource.ELECTRICITY)!);
          if (received[Resource.ELECTRICITY] < powerNeeded) {
            emitted.push({
              tag: "draw",
              resource: Resource.ELECTRICITY,
              amount: powerNeeded - received[Resource.ELECTRICITY],
              forId: miner.core.id,
              receivedTick: event.tick + 1,
            });
            if (received[Resource.ELECTRICITY] > 0) {
              miner.data.received.push({
                tag: "supply",
                resource: Resource.ELECTRICITY,
                amount: received[Resource.ELECTRICITY],
                toId: miner.core.id,
                receivedTick: event.tick,
              });
            }
          } else {
            emitted.push(
              {
                tag: "draw",
                resource: Resource.ELECTRICITY,
                amount: powerNeeded,
                forId: miner.core.id,
                receivedTick: event.tick + 1,
              },
              {
                tag: "mine-planet-surface",
                minerCount: miner.data.working,
                receivedTick: event.tick + 1,
              },
            );
          }
        }
    }
  }
  return [miner, emitted];
}

export function getMiners(simulation: Simulation) {
  const { count, working } = (
    simulation.processors.get("miner-0") as MinerManager | undefined
  )?.data ?? { count: 0, working: 0 };
  return { count, working };
}
