import type { Resource } from "../../gameRules";
import { constructionCosts } from "../../gameRules";
import type { BuildChoice, BuildOrder } from "../../types";
import { popNextConstruct } from "../../types";
import type { BusEvent, Events } from "../events";
import { compareReceivedTicks, indexOfFirstFutureEvent } from "../events";
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
  id: Fabricator["id"] = "fabricator-0",
  startingQueue: BuildOrder[] = [],
): Fabricator {
  return {
    id,
    tag: "fabricator",
    lastTick: Number.NEGATIVE_INFINITY,
    data: {
      working: true,
      job: null,
      queue: startingQueue,
      received: [],
    },
  };
}

/** this is just a simple optimization hack, to prevent needlessly allocating a new empty array that is immediately concat'ed
 * this should help pushing the sim clock tick rate up while refraining from thrashing the browser's garbage collector */
const EMPTY_ARRAY = [] as const;

export function fabricatorProcess(
  fabricator: Fabricator,
  inbox: BusEvent[],
): [Fabricator, BusEvent[]] {
  let event,
    emitted = [] as BusEvent[];
  while ((event = inbox.shift())) {
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
        emitted.push({
          tag: "fabricator-queue-set",
          queue: event.queue,
          beforeTick: event.afterTick + 1,
        });
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

        fabricator.data.received.sort(compareReceivedTicks);

        // now that the array is sorted, we can scan from the front to find the edge of the (contiguous) present|past events
        const firstFutureEventIndex = indexOfFirstFutureEvent(
          fabricator.data.received,
          tick,
        );

        const suppliedAtThisTick = fabricator.data.received
          .slice(0, firstFutureEventIndex)
          .reduce((supply, event) => {
            supply.set(
              event.resource,
              event.amount + (supply.get(event.resource) ?? 0n),
            );
            return supply;
          }, new Map<Resource, bigint>());

        let enoughSupplied = true;
        for (let [resource, needed] of constructionCosts[currentJob]) {
          const lacking = needed - (suppliedAtThisTick.get(resource) ?? 0n);
          if (lacking > 0) {
            enoughSupplied = false;
            emitted.push({
              tag: "draw",
              resource,
              amount: lacking,
              forId: fabricator.id,
              receivedTick: tick + 1,
            });
          }
        }
        if (!enoughSupplied) {
          break;
        }

        emitted.push({
          tag: "construct-fabricated",
          construct: currentJob,
          receivedTick: tick + 1,
        });

        const received = [...suppliedAtThisTick]
          .map(
            ([resource, supply]) =>
              ({
                tag: "supply",
                resource,
                amount:
                  supply - (constructionCosts[currentJob].get(resource) ?? 0n),
                toId: fabricator.id,
                receivedTick: tick,
              }) as Fabricator["data"]["received"][number],
          )
          .concat(
            firstFutureEventIndex === undefined
              ? EMPTY_ARRAY
              : fabricator.data.received.slice(firstFutureEventIndex),
          );
        fabricator.data = {
          working: true,
          job: null,
          received,
          queue: fabricator.data.queue,
        };
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
