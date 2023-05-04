import type { Resource } from "../../gameRules";
import { constructionCosts } from "../../gameRules";
import type { BuildChoice, BuildOrder } from "../../types";
import { popNextConstruct } from "../../types";
import type { BusEvent, Events } from "../events";
import type { Simulation } from "../index";
import type { EventProcessor } from "./index";

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
      case "command-turn-on-fabricator":
        fabricator.data.working = true;
        emitted.push({
          tag: "fabricator-turned-on",
          beforeTick: event.afterTick + 1,
        });
        break;
      case "command-turn-off-fabricator":
        fabricator.data.working = false;
        emitted.push({
          tag: "fabricator-turned-off",
          beforeTick: event.afterTick + 1,
        });
        break;
      case "command-set-fabricator-queue":
        fabricator.data.queue = event.queue;
        const busEvent = {
          tag: "fabricator-queue-set",
          queue: event.queue,
          beforeTick: event.afterTick + 1,
        } as const;
        emitted.push(busEvent);
        break;
      case "command-clear-fabricator-job":
        fabricator.data.job = null;
        break;
      case "supply":
        if (event.toId === fabricator.id) {
          fabricator.data.received.push(event);
        }
        break;
      case "simulation-clock-tick":
        const { tick } = event;
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
            received: fabricator.data.received,
          };
          break;
        }
        const supply = fabricator.data.received.reduce((supply, event) => {
          supply.set(
            event.resource,
            event.amount + (supply.get(event.resource) ?? 0n)
          );
          return supply;
        }, new Map<Resource, bigint>());
        let enoughSupplied = true;
        for (let [resource, needed] of constructionCosts[currentJob]) {
          const supplied = supply.get(resource) ?? 0n;
          if (supplied < needed) {
            enoughSupplied = false;
            emitted.push({
              tag: "draw",
              resource,
              amount: BigInt(needed) - supplied,
              forId: fabricator.id,
              receivedTick: tick + 1,
            });
          }
        }
        if (enoughSupplied) {
          emitted.push({
            tag: "construct-fabricated",
            construct: currentJob,
            receivedTick: tick + 1,
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
