import type { Event, Events } from "../events";
import type { SubscriptionsFor } from "../index";
import { Resource, tickConsumption } from "../../gameStateStore";
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
      case "supply":
        if (event.toId === miner.id) {
          miner.data.received.push(event);
        }
        break;
      case "simulation-clock-tick":
        emitted.push({
          tag: "draw",
          resource: Resource.ELECTRICITY,
          amount:
            miner.data.working *
            tickConsumption.miner.get(Resource.ELECTRICITY)!,
          forId: miner.id,
          receivedTick: event.tick + 1,
        });
        // spend all the power we were supplied on mining (if excess, waste it)
        const supplied = miner.data.received.reduce(
          (sum, e) => sum + e.amount,
          0
        );
        miner.data.received = [];
        if (
          supplied >=
          tickConsumption.miner.get(Resource.ELECTRICITY)! * miner.data.working
        ) {
          emitted.push({
            tag: "mine-planet-surface",
            minerCount: miner.data.working,
            receivedTick: event.tick + 1,
          });
        }
    }
  }
  return [miner, emitted];
}
