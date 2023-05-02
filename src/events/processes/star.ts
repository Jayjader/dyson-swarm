import type { BusEvent } from "../events";
import type { EventProcessor } from "./index";
import type { Simulation } from "../index";

export type Star = EventProcessor<"star", { mass: bigint }>;

export function createStar(
  id: Star["id"] = "star-0",
  mass: bigint = BigInt(1.989e30)
): Star {
  return { id, incoming: [], tag: "star", data: { mass } };
}

export function starProcess(star: Star): [Star, BusEvent[]] {
  let event;
  const emitted = [] as BusEvent[];
  while ((event = star.incoming.shift())) {
    switch (event.tag) {
      case "simulation-clock-tick":
        emitted.push({
          tag: "star-flux-emission",
          flux: 1n,
          receivedTick: event.tick + 1,
        });
        break;
    }
  }
  return [star, emitted];
}

export function getStarMass(simulation: Simulation): bigint {
  return (
    (simulation.processors.get("star-0") as Star | undefined)?.data.mass ?? 0n
  );
}
