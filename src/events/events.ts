import type { Construct, Resource } from "../gameRules";
import type { BuildOrder } from "../types";
import type { Id } from "./processes";

type TimeStamped = { timeStamp: DOMHighResTimeStamp };
export type AfterTick = { afterTick: number };
export type BeforeTick = { beforeTick: number };
export type ReceivedTick = { receivedTick: number };

export type Command<Tag extends string, Data = {}> = {
  tag: `command-${Tag}`;
} & TimeStamped &
  AfterTick &
  Data;

export type BusEvent =
  | ({ tag: "outside-clock-tick" } & TimeStamped)
  | { tag: "simulation-clock-tick"; tick: number }
  | Command<"simulation-clock-play">
  | ({ tag: "simulation-clock-play" } & BeforeTick)
  | Command<"simulation-clock-pause">
  | ({ tag: "simulation-clock-pause" } & BeforeTick)
  | Command<"simulation-clock-indirect-pause">
  | ({ tag: "simulation-clock-indirect-pause" } & BeforeTick)
  | Command<"simulation-clock-indirect-resume">
  | ({ tag: "simulation-clock-indirect-resume" } & BeforeTick)
  | Command<"simulation-clock-start-editing-speed">
  | ({ tag: "simulation-clock-editing-speed" } & BeforeTick)
  | Command<"simulation-clock-set-speed", { speed: number }>
  | ({ tag: "simulation-clock-new-speed"; speed: number } & BeforeTick)
  | ({ tag: "star-flux-emission"; flux: bigint } & ReceivedTick)
  | ({ tag: "mine-planet-surface"; minerCount: number } & ReceivedTick)
  | ({
      tag: "produce";
      resource: Resource;
      amount: bigint;
    } & ReceivedTick)
  | ({
      tag: "draw";
      resource: Resource;
      amount: bigint;
      forId: Id;
    } & ReceivedTick)
  | ({
      tag: "supply";
      resource: Resource;
      amount: bigint;
      toId: Id;
    } & ReceivedTick)
  | ({ tag: "launch-satellite"; count?: number } & ReceivedTick)
  | ({ tag: "satellite-flux-reflection"; flux: bigint } & ReceivedTick)
  | ({ tag: "construct-fabricated"; construct: Construct } & ReceivedTick)
  | { tag: "circuit-breaker-tripped"; onTick: number }
  | Command<"reset-circuit-breaker">
  | { tag: "circuit-breaker-reset"; onTick: number }
  | Command<"trip-circuit-breaker">
  | Command<
      "set-working-count",
      {
        construct: Exclude<Construct, Construct.SOLAR_COLLECTOR>;
        count: number;
      }
    >
  | ({
      tag: "working-count-set";
      construct: Exclude<Construct, Construct.SOLAR_COLLECTOR>;
      count: number;
    } & BeforeTick)
  | Command<"turn-on-fabricator">
  | ({ tag: "fabricator-turned-on" } & BeforeTick)
  | Command<"turn-off-fabricator">
  | ({ tag: "fabricator-turned-off" } & BeforeTick)
  | Command<
      "set-fabricator-queue",
      {
        queue: BuildOrder[];
      }
    >
  | ({ tag: "fabricator-queue-set"; queue: BuildOrder[] } & BeforeTick)
  | Command<"clear-fabricator-job">;
export type EventTag = BusEvent["tag"];

// helper type to extract a subset of possible events based on just their tags
export type Events<Tags extends EventTag> = BusEvent & { tag: Tags };

export function indexOfFirstFutureEvent(
  events: (BusEvent & ReceivedTick)[],
  lastTick: number
): number | undefined {
  const index = events.findIndex(({ receivedTick }) => receivedTick > lastTick);
  return index >= 0 ? index : undefined; // convert -1 ("not found") result to undefined, encoding it in the type
}

export function compareReceivedTicks<E extends BusEvent & ReceivedTick>(
  a: E,
  b: E
): number {
  return a.receivedTick - b.receivedTick;
}
