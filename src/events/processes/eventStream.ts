import type { Simulation } from "../index";
import type {
  AfterTick,
  BeforeTick,
  BusEvent,
  Events,
  ReceivedTick,
} from "../events";
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
  id: EventStream["id"] = "stream-0"
): EventStream {
  return {
    id,
    incoming: [],
    tag: "stream",
    data: { unfinishedTick: 0, received: new Map() },
  };
}

function pushEvent(
  stream: EventStream,
  event: EventStream["incoming"][number],
  tick: number
): void {
  const received = stream.data.received.get(tick);
  if (received !== undefined) {
    received.push(event);
  } else {
    stream.data.received.set(tick, [event]);
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

export function memoryStreamProcess(stream: EventStream): EventStream {
  // if (
  //   stream.incoming.length >= 1 &&
  //   stream.incoming[0].tag === "simulation-clock-tick"
  // ) {
  //   console.debug({ eventStream: stream });
  // }
  let event: typeof stream.incoming[number];
  while ((event = stream.incoming.shift()!)) {
    if (event.tag === "simulation-clock-tick") {
      stream.data.unfinishedTick = event.tick;
    }
    const { afterTick, beforeTick, receivedTick, onTick } =
      event as unknown as Partial<
        AfterTick & BeforeTick & ReceivedTick & { onTick: number }
      >;
    const eventTick =
      receivedTick ??
      afterTick ??
      beforeTick ??
      onTick ??
      stream.data.unfinishedTick;
    pushEvent(stream, event, eventTick);
  }
  stream.incoming = [];
  return stream;
}

export function getEventStream(simulation: Simulation) {
  return simulation.processors.get("stream-0") as EventStream;
}

export function getTickEvents(
  stream: EventStream,
  tick: number
): BusEvent[] | undefined {
  return stream.data.received.get(tick);
}
