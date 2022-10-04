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
  | { tag: "star-flux-emission"; flux: number; tick: number }
  | { tag: "collector-power-production"; power: number; tick: number };
export type EventTag = Event["tag"];
export type Events<Tags extends EventTag> = Event & { tag: Tags };
