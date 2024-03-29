import type { BusEvent } from "../events";
import type { EventProcessor } from "./index";
import type { Simulation } from "../index";
import { SOL_LUMINOSITY_W, SOL_MASS_KG, SOL_RADIUS_M } from "../../gameRules";

export type Star = EventProcessor<"star", { mass: bigint }>;

/** earth's sun will last in its current mode for around 5e9 years - several orders of magnitude greater than the
 simulation time needed to complete a swarm, even at 1 satellite launched per tick (currently at around 1e4 years).
 for the simulation's purpose, we can basically consider the star to be in a constant, steady state.
 */

export function createStar(
  id: Star["id"] = "star-0",
  mass = SOL_MASS_KG
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
          flux: SOL_LUMINOSITY_W,
          // emissionSurfaceRadius: SOL_RADIUS_M,
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
