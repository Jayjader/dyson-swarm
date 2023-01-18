import type { Resource } from "../../gameRules";
import type { BusEvent, Events } from "../events";
import type { Simulation } from "../index";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor, Id } from "./index";

export type Storage<R extends string> = EventProcessor<
  `storage-${R}`,
  {
    stored: number;
    received: Events<
      Exclude<SubscriptionsFor<`storage-${R}`>, "simulation-clock-tick">
    >[];
  }
>;

export function createStorage<
  R extends Exclude<Resource, Resource.ELECTRICITY>
>(
  resource: R,
  options: Partial<{ id: Storage<R>["id"]; stored: number }> = {}
): Storage<R> {
  const tag = `storage-${resource}`;
  const values = { id: `${tag}-0`, stored: 0, ...options };
  return {
    id: values.id,
    tag,
    incoming: [],
    data: { stored: values.stored, received: [] },
  } as unknown as Storage<R>;
}

export function storageProcess(
  resource: Exclude<Resource, Resource.ELECTRICITY>,
  storage: Storage<typeof resource>
): [typeof storage, BusEvent[]] {
  let event;
  const emitted = [] as BusEvent[];
  while ((event = storage.incoming.shift())) {
    switch (event.tag) {
      case "draw":
      case "produce":
        if (event.resource === resource) {
          storage.data.received.push(event);
          (storage.data.received as Events<"draw" | "supply">[]).sort(
            (a, b) => a.receivedTick - b.receivedTick
          );
        }
        break;
      case "simulation-clock-tick":
        let totalResourceReceived = 0,
          toSupply = new Set<Events<"draw">>(),
          totalDrawn = 0;
        let e;
        while (
          (e = storage.data.received.shift() as Events<"draw" | "produce">) !==
            undefined &&
          e.receivedTick <= event.tick
        ) {
          if (e.tag === "produce") {
            totalResourceReceived += e.amount;
          } else if (e.tag === "draw") {
            toSupply.add(e);
            totalDrawn += e.amount;
          }
        }
        storage.data.stored += totalResourceReceived;
        if (storage.data.stored >= totalDrawn) {
          for (let s of toSupply) {
            emitted.push({
              tag: "supply",
              resource: s.resource,
              amount: s.amount,
              toId: s.forId,
              receivedTick: event.tick + 1,
            });
          }
          storage.data.stored -= totalDrawn;
        }
    }
  }
  return [storage, emitted];
}
export function readStored(simulation: Simulation, resource: Resource): number {
  return (
    (
      simulation.processors.get(
        `storage-${resource}-0` as unknown as Id
      ) as Storage<Resource>
    )?.data.stored ?? 0
  );
}
