import type { EventProcessor } from "./index";
import type { BuildChoice, BuildOrder } from "../../types";
import type { Event, Events } from "../events";
import type { SubscriptionsFor } from "../index";
import type { Resource } from "../../gameStateStore";
import { constructionCosts } from "../../actions";

export type Fabricator = EventProcessor<
  "fabricator",
  {
    working: boolean;
    job: BuildChoice;
    queue: BuildOrder[];
    received: Events<
      Exclude<SubscriptionsFor<"fabricator">, "simulation-clock-tick">
    >[];
  }
>;

export function createFabricator(
  id: Fabricator["id"] = "fabricator-0"
): Fabricator {
  return {
    id,
    tag: "fabricator",
    incoming: [],
    data: { working: true, job: null, queue: [], received: [] },
  };
}

export function fabricatorProcess(
  fabricator: Fabricator
): [Fabricator, Event[]] {
  let event,
    emitted = [] as Event[];
  while ((event = fabricator.incoming.shift())) {
    switch (event.tag) {
      case "simulation-clock-tick":
        if (!(fabricator.data.working && fabricator.data.job !== null)) {
          break;
        }
        const supply = fabricator.data.received.reduce((supply, event) => {
          supply.set(
            event.resource,
            event.amount + (supply.get(event.resource) ?? 0)
          );
          return supply;
        }, new Map<Resource, number>());
        for (let [resource, needed] of constructionCosts[fabricator.data.job]) {
          const supplied = supply.get(resource) ?? 0;
          if (supplied < needed) {
            emitted.push({
              tag: "draw",
              resource,
              amount: needed - supplied,
              forId: fabricator.id,
              receivedTick: event.tick + 1,
            });
          }
        }
        break;
    }
  }
  return [fabricator, emitted];
}
