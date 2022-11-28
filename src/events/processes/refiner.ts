import type { Event, Events } from "../events";
import {
  Resource,
  tickConsumption,
  tickProduction,
} from "../../gameStateStore";
import type { SubscriptionsFor } from "../index";
import type { EventProcessor } from "./index";

export type Refiner = EventProcessor<
  "refiner",
  {
    working: boolean;
    received: Events<
      Exclude<SubscriptionsFor<"refiner">, "simulation-clock-tick">
    >[];
  }
>;

export function createRefiner(
  id: Refiner["id"] = "refiner-0",
  working = true
): Refiner {
  return { id, tag: "refiner", incoming: [], data: { working, received: [] } };
}

export function refinerProcess(refiner: Refiner): [Refiner, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = refiner.incoming.shift())) {
    switch (event.tag) {
      case "supply":
        if (event.toId === refiner.id) {
          refiner.data.received.push(event);
        }
        break;
      case "simulation-clock-tick":
        emitted.push(
          {
            tag: "draw",
            resource: Resource.ELECTRICITY,
            amount: tickConsumption.refinery.get(Resource.ELECTRICITY)!,
            forId: refiner.id,
            receivedTick: event.tick + 1,
          }, // TODO: move this emission into the if (totalPower < ...) block ?
          {
            tag: "draw",
            resource: Resource.ORE,
            amount: tickConsumption.refinery.get(Resource.ORE)!,
            forId: refiner.id,
            receivedTick: event.tick + 1,
          } // TODO: move this emission into the if (ore.length > 0) block ?
        );
        // spend all the power we were supplied on refining (if excess, waste it)
        const [totalPower, ore] = refiner.data.received.reduce(
          (sum, e) => {
            if (e.resource === Resource.ELECTRICITY) {
              return [sum[0] + e.amount, sum[1]];
            } else {
              sum[1].push(e);
              return sum;
            }
          },
          [0, [] as Events<"supply">[]]
        );
        refiner.data.received = [];
        if (totalPower < tickConsumption.refinery.get(Resource.ELECTRICITY)!) {
          refiner.data.received = ore;
          break;
        }
        if (ore.length > 0) {
          ore.unshift();
          refiner.data.received = ore;
          emitted.push({
            tag: "produce",
            resource: Resource.METAL,
            amount: tickProduction.refinery.get(Resource.METAL)!,
            receivedTick: event.tick + 1,
          });
        }
        break;
    }
  }
  return [refiner, emitted];
}
