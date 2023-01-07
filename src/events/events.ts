import type { Id } from "./processes";
import type { Resource, Construct } from "../gameStateStore";
import type { BuildOrder } from "../types";

type TimeStamped = { timeStamp: DOMHighResTimeStamp };
type AfterTick = { afterTick: number };
type BeforeTick = { beforeTick: number };
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
  | ({
      tag: "command-simulation-clock-set-speed";
      speed: number;
    } & AfterTick &
      TimeStamped)
  | ({ tag: "simulation-clock-new-speed"; speed: number } & BeforeTick)
  | { tag: "star-flux-emission"; flux: number; receivedTick: number }
  | { tag: "mine-planet-surface"; minerCount: number; receivedTick: number }
  | {
      tag: "produce";
      resource: Resource;
      amount: number;
      receivedTick: number;
    }
  | {
      tag: "draw";
      resource: Resource;
      amount: number;
      forId: Id;
      receivedTick: number;
    }
  | {
      tag: "supply";
      resource: Resource;
      amount: number;
      toId: Id;
      receivedTick: number;
    }
  | { tag: "launch-satellite"; receivedTick: number }
  | { tag: "satellite-flux-reflection"; flux: number; receivedTick: number }
  | { tag: "construct-fabricated"; construct: Construct; receivedTick: number }
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
  | ({
      tag: "command-set-fabricator-queue";
      queue: BuildOrder[];
    } & TimeStamped &
      AfterTick)
  | ({ tag: "fabricator-queue-set"; queue: BuildOrder[] } & BeforeTick);
export type EventTag = BusEvent["tag"];

// helper type to extract a subset of possible events based on just their tags
export type Events<Tags extends EventTag> = BusEvent & { tag: Tags };
