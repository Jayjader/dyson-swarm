import type { Id } from "./processes";
import type { Resource } from "../gameStateStore";
import type { Construct } from "../gameStateStore";

export type Event =
  | { tag: "outside-clock-tick"; timeStamp: DOMHighResTimeStamp }
  | { tag: "simulation-clock-tick"; tick: number }
  | { tag: "command-simulation-clock-play" }
  | { tag: "simulation-clock-play" }
  | { tag: "command-simulation-clock-pause" }
  | { tag: "simulation-clock-pause" }
  | { tag: "command-simulation-clock-indirect-pause" }
  | { tag: "simulation-clock-indirect-pause" }
  | { tag: "command-simulation-clock-indirect-resume" }
  | { tag: "simulation-clock-indirect-resume" }
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
  | { tag: "command-reset-circuit-breaker"; afterTick: number }
  | { tag: "circuit-breaker-reset"; onTick: number }
  | { tag: "command-trip-circuit-breaker"; afterTick: number }
  | {
      tag: "command-set-working-count";
      construct: Exclude<Construct, Construct.SOLAR_COLLECTOR>;
      count: number;
      receivedTick: number;
    };
export type EventTag = Event["tag"];

// helper type to extract a subset of possible events based on just their tags
export type Events<Tags extends EventTag> = Event & { tag: Tags };
