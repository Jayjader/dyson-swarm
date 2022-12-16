import type { Event, Events } from "../events";
import { Resource } from "../../gameStateStore";
import type { SubscriptionsFor } from "../index";
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
  id: CollectorManager["id"] = "collector-0"
): CollectorManager {
  return {
    id,
    incoming: [],
    tag: "collector",
    data: { count: 0, received: [] },
  };
}

export function collectorProcess(
  c: CollectorManager
): [CollectorManager, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = c.incoming.shift())) {
    switch (event.tag) {
      case "star-flux-emission":
      case "satellite-flux-reflection":
        c.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const produced =
          c.data.count * c.data.received.reduce((sum, e) => sum + e.flux, 0);
        c.data.received = [];
        emitted.push({
          tag: "produce",
          resource: Resource.ELECTRICITY,
          amount: produced,
          receivedTick: event.tick + 1,
        });
        break;
    }
  }
  return [c, emitted];
}
