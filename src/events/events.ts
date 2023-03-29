import type { Construct, Resource } from "../gameRules";
import type { BuildOrder } from "../types";
import type { Id } from "./processes";

type TimeStamped = { timeStamp: DOMHighResTimeStamp };
export type AfterTick = { afterTick: number };
export type BeforeTick = { beforeTick: number };
export type ReceivedTick = { receivedTick: number };

export type BusEvent =
  | ({ tag: "outside-clock-tick" } & TimeStamped)
  | { tag: "simulation-clock-tick"; tick: number }
  | ({ tag: "command-simulation-clock-play" } & AfterTick & TimeStamped)
  | ({ tag: "simulation-clock-play" } & BeforeTick)
  | ({ tag: "command-simulation-clock-pause" } & AfterTick & TimeStamped)
  | ({ tag: "simulation-clock-pause" } & BeforeTick)
  | ({ tag: "command-simulation-clock-indirect-pause" } & AfterTick &
      TimeStamped)
  | ({ tag: "simulation-clock-indirect-pause" } & BeforeTick)
  | ({ tag: "command-simulation-clock-indirect-resume" } & AfterTick &
      TimeStamped)
  | ({ tag: "simulation-clock-indirect-resume" } & BeforeTick)
  | ({ tag: "command-simulation-clock-start-editing-speed" } & AfterTick &
      TimeStamped)
  | ({ tag: "simulation-clock-editing-speed" } & BeforeTick)
  | ({
      tag: "command-simulation-clock-set-speed";
      speed: number;
    } & AfterTick &
      TimeStamped)
  | ({ tag: "simulation-clock-new-speed"; speed: number } & BeforeTick)
  | ({ tag: "star-flux-emission"; flux: number } & ReceivedTick)
  | ({ tag: "mine-planet-surface"; minerCount: number } & ReceivedTick)
  | ({
      tag: "produce";
      resource: Resource;
      amount: number;
    } & ReceivedTick)
  | ({
      tag: "draw";
      resource: Resource;
      amount: number;
      forId: Id;
    } & ReceivedTick)
  | ({
      tag: "supply";
      resource: Resource;
      amount: number;
      toId: Id;
    } & ReceivedTick)
  | ({ tag: "launch-satellite", count?: number } & ReceivedTick)
  | ({ tag: "satellite-flux-reflection"; flux: number } & ReceivedTick)
  | ({ tag: "construct-fabricated"; construct: Construct } & ReceivedTick)
  | { tag: "circuit-breaker-tripped"; onTick: number }
  | ({ tag: "command-reset-circuit-breaker" } & TimeStamped & AfterTick)
  | { tag: "circuit-breaker-reset"; onTick: number }
  | ({ tag: "command-trip-circuit-breaker" } & TimeStamped & AfterTick)
  | ({
      tag: "command-set-working-count";
      construct: Exclude<Construct, Construct.SOLAR_COLLECTOR>;
      count: number;
    } & TimeStamped &
      AfterTick)
  | ({
      tag: "working-count-set";
      construct: Exclude<Construct, Construct.SOLAR_COLLECTOR>;
      count: number;
    } & BeforeTick)
  | ({ tag: "command-turn-on-fabricator" } & TimeStamped & AfterTick)
  | ({ tag: "fabricator-turned-on" } & BeforeTick)
  | ({ tag: "command-turn-off-fabricator" } & TimeStamped & AfterTick)
  | ({ tag: "fabricator-turned-off" } & BeforeTick)
  | ({
      tag: "command-set-fabricator-queue";
      queue: BuildOrder[];
    } & TimeStamped &
      AfterTick)
  | ({ tag: "fabricator-queue-set"; queue: BuildOrder[] } & BeforeTick)
  | ({ tag: "command-clear-fabricator-job" } & AfterTick & TimeStamped);
export type EventTag = BusEvent["tag"];

// helper type to extract a subset of possible events based on just their tags
export type Events<Tags extends EventTag> = BusEvent & { tag: Tags };
