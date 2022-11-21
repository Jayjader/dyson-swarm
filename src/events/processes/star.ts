import type { Event } from "../events";
import type { EventProcessor } from "./index";

export type Star = EventProcessor<"star", { mass: number }>;

export function createStar(
  id: Star["id"] = "star-0",
  mass: number = 1.989e30
): Star {
  return { id, incoming: [], tag: "star", data: { mass } };
}

export function starProcess(star: Star): [Star, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = star.incoming.shift())) {
    switch (event.tag) {
      case "simulation-clock-tick":
        emitted.push({
          tag: "star-flux-emission",
          flux: 1,
          receivedTick: event.tick + 1,
        });
        break;
    }
  }
  return [star, emitted];
}
