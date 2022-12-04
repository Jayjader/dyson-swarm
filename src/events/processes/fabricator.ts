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
      case "supply":
        if (event.toId === fabricator.id) {
          fabricator.data.received.push(event);
        }
        break;
      case "simulation-clock-tick":
        const currentJob = fabricator.data.job;
        if (fabricator.data.working && currentJob !== null) {
          const supply = fabricator.data.received.reduce((supply, event) => {
            supply.set(
              event.resource,
              event.amount + (supply.get(event.resource) ?? 0)
            );
            return supply;
          }, new Map<Resource, number>());
          let enoughSupplied = true;
          for (let [resource, needed] of constructionCosts[currentJob]) {
            const supplied = supply.get(resource) ?? 0;
            if (supplied < needed) {
              enoughSupplied = false;
              emitted.push({
                tag: "draw",
                resource,
                amount: needed - supplied,
                forId: fabricator.id,
                receivedTick: event.tick + 1,
              });
            }
          }
          if (enoughSupplied) {
            emitted.push({
              tag: "construct-fabricated",
              construct: currentJob,
              receivedTick: event.tick + 1,
            });
            fabricator.data = {
              working: true,
              job: null,
              received: [],
              queue: fabricator.data.queue,
            };
          }
        }
        break;
    }
  }
  return [fabricator, emitted];
}
