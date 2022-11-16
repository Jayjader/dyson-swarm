import type { Id } from "./processing";
import type { Resource } from "../gameStateStore";

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
  | { tag: "collector-power-production"; power: number; receivedTick: number }
  | { tag: "draw-power"; power: number; forId: Id; receivedTick: number }
  | { tag: "supply-power"; power: number; toId: Id; receivedTick: number }
  | { tag: "mine-planet-surface"; receivedTick: number }
  | {
      tag: `produce-${Exclude<Resource, Resource.ELECTRICITY>}`;
      amount: number;
      receivedTick: number;
    };
export type EventTag = Event["tag"];

// helper type to extract a subset of possible events based on just their tags
export type Events<Tags extends EventTag> = Event & { tag: Tags };
