import type { Event, Events } from "../events";
import type { SubscriptionsFor } from "../index";
import { Construct, Resource, tickConsumption } from "../../gameStateStore";
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
  options: Partial<{ id: MinerManager["id"]; count: number }> = {}
): MinerManager {
  const values = { id: "miner-0" as MinerManager["id"], count: 0, ...options };
  return {
    id: values.id,
    tag: "miner",
    incoming: [],
    data: {
      working: values.count,
      count: values.count,
      received: [],
    },
  };
}

export function minerProcess(miner: MinerManager): [MinerManager, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = miner.incoming.shift())) {
    switch (event.tag) {
      case "construct-fabricated":
      case "command-set-working-count":
        if (event.construct === Construct.MINER) {
          miner.data.received.push(event);
        }
        break;
      case "supply":
        if (event.toId === miner.id) {
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
            [Resource.ELECTRICITY]: 0,
            fabricated: 0,
            working: null as null | number,
          }
        );
        miner.data.count += received.fabricated;
        miner.data.working += received.fabricated;
        if (received.working !== null) {
          miner.data.working = received.working;
        }
        if (miner.data.working > 0) {
          miner.data.received = [];
          const powerNeeded =
            miner.data.working *
            tickConsumption.miner.get(Resource.ELECTRICITY)!;
          if (received[Resource.ELECTRICITY] < powerNeeded) {
            emitted.push({
              tag: "draw",
              resource: Resource.ELECTRICITY,
              amount: powerNeeded - received[Resource.ELECTRICITY],
              forId: miner.id,
              receivedTick: event.tick + 1,
            });
            if (received[Resource.ELECTRICITY] > 0) {
              miner.data.received.push({
                tag: "supply",
                resource: Resource.ELECTRICITY,
                amount: received[Resource.ELECTRICITY],
                toId: miner.id,
                receivedTick: event.tick,
              });
            }
          } else {
            emitted.push({
              tag: "mine-planet-surface",
              minerCount: miner.data.working,
              receivedTick: event.tick + 1,
            });
          }
        }
    }
  }
  return [miner, emitted];
}
