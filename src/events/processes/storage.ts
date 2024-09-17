import type { Resource } from "../../gameRules";
import type { BusEvent, Events } from "../events";
import type { Simulation } from "../index";
import type { EventProcessor, Id } from "./index";

export type Storage<R extends string> = EventProcessor<
  `storage-${R}`,
  {
    stored: bigint;
    received: Events<"draw" | "produce">[];
  }
>;

export function createStorage<
  R extends Exclude<Resource, Resource.ELECTRICITY>,
>(
  resource: R,
  options: Partial<{ id: Storage<R>["id"]; stored: bigint }> = {},
): Storage<R> {
  const tag = `storage-${resource}`;
  const values = { id: `${tag}-0`, stored: 0n, ...options };
  return {
    id: values.id,
    tag,
    lastTick: Number.NEGATIVE_INFINITY,
    data: { stored: values.stored, received: [] },
  } as unknown as Storage<R>;
}

export function storageProcess(
  resource: Exclude<Resource, Resource.ELECTRICITY>,
  storage: Storage<typeof resource>,
  inbox: BusEvent[],
): [typeof storage, BusEvent[]] {
  let event;
  const emitted = [] as BusEvent[];
  while ((event = inbox.shift())) {
    switch (event.tag) {
      case "draw":
      case "produce":
        if (event.resource === resource) {
          if (event.amount <= 0n) {
            console.warn({
              warning: "draw|produce event with amount <= 0 detected",
              event,
            });
            break;
          }
          storage.data.received.push(event);
          (storage.data.received as Events<"draw" | "produce">[]).sort(
            (a, b) => a.receivedTick - b.receivedTick,
          );
        }
        break;
      case "simulation-clock-tick":
        let totalResourceReceived = 0n,
          toSupply = new Set<Events<"draw">>(),
          totalDrawn = 0n;
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
export function readStored(simulation: Simulation, resource: Resource): bigint {
  return (
    (
      simulation.processors.get(
        `storage-${resource}-0` as unknown as Id,
      ) as Storage<Resource>
    )?.data.stored ?? 0n
  );
}
