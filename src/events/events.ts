export type Event =
  | { tag: "outside-clock-tick"; timeStamp: DOMHighResTimeStamp }
  | { tag: "simulation-clock-tick"; tick: number }
  | { tag: "command-simulation-clock-play" }
  | { tag: "simulation-clock-play" }
  | { tag: "star-flux-emission"; flux: number; tick: number }
  | { tag: "collector-power-production"; power: number; tick: number };
export type EventTag = Event["tag"];
export type Events<Tags extends EventTag> = Event & { tag: Tags };
