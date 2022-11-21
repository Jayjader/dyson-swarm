import type { Event, Events } from "../events";
import { Resource } from "../../gameStateStore";
import type { SubscriptionsFor } from "../index";
import type { EventProcessor } from "./index";

export type Collector = EventProcessor<
  "collector",
  {
    received: Events<
      Exclude<SubscriptionsFor<"collector">, "simulation-clock-tick">
    >[];
  }
>;

export function createCollector(
  id: Collector["id"] = "collector-0"
): Collector {
  return {
    id,
    incoming: [],
    tag: "collector",
    data: { received: [] },
  };
}

export function collectorProcess(c: Collector): [Collector, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = c.incoming.shift())) {
    switch (event.tag) {
      case "star-flux-emission":
        c.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const produced = c.data.received.reduce((sum, e) => sum + e.flux, 0);
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
