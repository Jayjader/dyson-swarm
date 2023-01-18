import { Construct, Resource } from "../../gameRules";
import type { BusEvent, Events } from "../events";
import type { Simulation } from "../index";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";

export type CollectorManager = EventProcessor<
  "collector",
  {
    count: number;
    received: Events<
      Exclude<SubscriptionsFor<"collector">, "simulation-clock-tick">
    >[];
  }
>;

export function createCollectorManager(
  options: Partial<{ id: CollectorManager["id"]; count: number }> = {}
): CollectorManager {
  const values = {
    id: "collector-0" as CollectorManager["id"],
    count: 0,
    ...options,
  };
  return {
    id: values.id,
    incoming: [],
    tag: "collector",
    data: { count: values.count, received: [] },
  };
}

export function collectorProcess(
  c: CollectorManager
): [CollectorManager, BusEvent[]] {
  let event;
  const emitted = [] as BusEvent[];
  while ((event = c.incoming.shift())) {
    switch (event.tag) {
      case "construct-fabricated":
        if (event.construct !== Construct.SOLAR_COLLECTOR) {
          break;
        }
      case "star-flux-emission":
      case "satellite-flux-reflection":
        c.data.received.push(event);
        break;
      case "simulation-clock-tick": {
        const received = c.data.received.reduce(
          (sum, e) => {
            if (e.tag === "construct-fabricated") {
              sum.fabricated += 1;
            } else {
              sum.flux += e.flux;
            }
            return sum;
          },
          { flux: 0, fabricated: 0 }
        );
        c.data.count += received.fabricated;
        c.data.received = [];
        const produced = c.data.count * received.flux;
        if (produced > 0) {
          emitted.push({
            tag: "produce",
            resource: Resource.ELECTRICITY,
            amount: produced,
            receivedTick: event.tick + 1,
          });
        }
      }
    }
  }
  return [c, emitted];
}

export function getCollectorCount(simulation: Simulation): number {
  return (
    (simulation.processors.get("collector-0") as CollectorManager | undefined)
      ?.data.count ?? 0
  );
}
