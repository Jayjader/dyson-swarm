import type { Event, Events } from "../events";
import type { EventProcessor } from "./index";
import type { SubscriptionsFor } from "../index";
import {
  Resource,
  tickConsumption,
  tickProduction,
} from "../../gameStateStore";

export type SatFactory = EventProcessor<
  "factory",
  {
    working: boolean;
    received: Events<
      Exclude<SubscriptionsFor<"factory">, "simulation-clock-tick">
    >[];
  }
>;
export function createFactory(id: SatFactory["id"] = "factory-0"): SatFactory {
  return {
    id,
    tag: "factory",
    incoming: [],
    data: { working: true, received: [] },
  };
}
export function factoryProcess(factory: SatFactory): [SatFactory, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = factory.incoming.shift())) {
    switch (event.tag) {
      case "supply":
        if (event.toId === factory.id) {
          factory.data.received.push(event);
        }
        break;
      case "simulation-clock-tick":
        emitted.push(
          {
            tag: "draw",
            resource: Resource.ELECTRICITY,
            amount: tickConsumption.factory.get(Resource.ELECTRICITY)!,
            forId: factory.id,
            receivedTick: event.tick + 1,
          },
          {
            tag: "draw",
            resource: Resource.METAL,
            amount: tickConsumption.factory.get(Resource.METAL)!,
            forId: factory.id,
            receivedTick: event.tick + 1,
          }
        );
        // spend all the power we were supplied on producing satellite (if excess, waste it)
        const [totalPower, metal] = factory.data.received.reduce(
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
        if (totalPower < tickConsumption.factory.get(Resource.ELECTRICITY)!) {
          factory.data.received = metal;
          break;
        }
        if (metal.length > 0) {
          metal.shift();
          factory.data.received = metal;
          emitted.push({
            tag: "produce",
            resource: Resource.PACKAGED_SATELLITE,
            amount: tickProduction.factory.get(Resource.PACKAGED_SATELLITE)!,
            receivedTick: event.tick + 1,
          });
        }
        break;
    }
  }
  return [factory, emitted];
}
