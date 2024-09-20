import { type BusEvent, type Events, getTick } from "../events";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";

export type EventStream = EventProcessor<
  "stream",
  {
    unfinishedTick: number;
    received: Map<
      number,
      Events<Exclude<SubscriptionsFor<"stream">, "outside-clock-tick">>[]
    >;
  }
>;

type Value<M> = M extends Map<infer _, infer V> ? V : never;
type Data = {
  [K in keyof EventStream["data"]]: K extends "received"
    ? Array<[number, Value<EventStream["data"]["received"]>]>
    : EventStream["data"][K];
};
export type SerializedStream = {
  [K in keyof EventStream]: K extends "data" ? Data : EventStream[K];
};

export function createMemoryStream(
  id: EventStream["core"]["id"] = "stream-0",
): EventStream {
  return {
    core: {
      id,
      lastTick: Number.NEGATIVE_INFINITY,
      tag: "stream",
    },
    data: { unfinishedTick: 0, received: new Map() },
  };
}

function pushEvent(stream: EventStream, event: BusEvent, tick: number): void {
  const received = stream.data.received.get(tick);
  if (received !== undefined) {
    received.push(event as any);
  } else {
    stream.data.received.set(tick, [event as any]);
  }
}

export function parseStream(serialized: SerializedStream): EventStream {
  console.info({ serialized });
  return {
    ...serialized,
    data: {
      unfinishedTick: serialized.data.unfinishedTick,
      received: new Map(serialized.data.received),
    },
  };
}

export function memoryStreamProcess(
  stream: EventStream,
  inbox: BusEvent[],
): EventStream {
  if (inbox.length >= 1 && inbox[0].tag === "simulation-clock-tick") {
    console.debug({ eventStream: stream });
  }
  let event: BusEvent;
  while ((event = inbox.shift()!)) {
    if (event.tag === "simulation-clock-tick") {
      stream.data.unfinishedTick = event.tick;
    }
    const eventTick = getTick(event) ?? stream.data.unfinishedTick;
    pushEvent(stream, event, eventTick);
  }
  return stream;
}
