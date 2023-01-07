import type { EventProcessor } from "./index";
import type { BuildChoice, BuildOrder } from "../../types";
import { popNextConstruct } from "../../types";
import type { BusEvent, Events } from "../events";
import type { Resource } from "../../gameRules";
import type { Simulation } from "../index";
import {constructionCosts} from "../../gameRules";

export type Fabricator = EventProcessor<
  "fabricator",
  {
    working: boolean;
    job: BuildChoice;
    queue: BuildOrder[];
    received: Events<"supply">[];
  }
>;

export function createFabricator(
  id: Fabricator["id"] = "fabricator-0"
): Fabricator {
  return {
    id,
    tag: "fabricator",
    incoming: [],
    data: {
      working: true,
      job: null,
      queue: [],
      received: [],
    },
  };
}

export function fabricatorProcess(
  fabricator: Fabricator
): [Fabricator, BusEvent[]] {
  let event,
    emitted = [] as BusEvent[];
  while ((event = fabricator.incoming.shift())) {
    switch (event.tag) {
      case "command-set-fabricator-queue":
        fabricator.data.queue = event.queue;
        const busEvent = {
          tag: "fabricator-queue-set",
          queue: event.queue,
          beforeTick: event.afterTick + 1,
        } as const;
        console.debug(busEvent);
        emitted.push(busEvent);
        break;
      case "supply":
        if (event.toId === fabricator.id) {
          fabricator.data.received.push(event);
        }
        break;
      case "simulation-clock-tick":
        const currentJob = fabricator.data.job;
        if (!fabricator.data.working) {
          break;
        }
        if (currentJob === null) {
          const [nextJob, newQueue] = popNextConstruct(fabricator.data.queue);
          fabricator.data = {
            job: nextJob,
            queue: newQueue,
            working: true,
            received: [],
          };
          break;
        }
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
        break;
    }
  }
  return [fabricator, emitted];
}

export function getFabricator(simulation: Simulation) {
  const { working, queue, job, received } = (
    simulation.processors.get("fabricator-0") as Fabricator | undefined
  )?.data ?? { working: false, job: null, queue: [], received: [] };
  return { working, queue, job, received };
}
