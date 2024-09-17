import type { BusEvent, Events } from "../events";
import { compareReceivedTicks, indexOfFirstFutureEvent } from "../events";
import type { Simulation } from "../index";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";
import { MERCURY_SEMIMAJOR_AXIS_M } from "../../gameRules";

export type SatelliteSwarm = EventProcessor<
  "swarm",
  {
    averageDistanceFromStar: bigint;
    count: number;
    received: Events<
      Exclude<SubscriptionsFor<"swarm">, "simulation-clock-tick">
    >[];
  }
>;
export function createSwarm(
  options: Partial<{
    id: SatelliteSwarm["core"]["id"];
    count: number;
    averageDistanceFromStar: bigint;
  }> = {},
): SatelliteSwarm {
  const values = {
    id: "swarm-0" as SatelliteSwarm["core"]["id"],
    count: 0,
    averageDistanceFromStar: MERCURY_SEMIMAJOR_AXIS_M, // satellites in orbit around mercury (for now?)
    ...options,
  };
  return {
    core: {
      id: values.id,
      tag: "swarm",
      lastTick: Number.NEGATIVE_INFINITY,
    },
    data: {
      count: values.count,
      received: [],
      averageDistanceFromStar: values.averageDistanceFromStar,
    },
  };
}

export function fluxReflected(
  fluxEmitted: bigint,
  reflectionOrbitSurfaceRadius: bigint,
  swarmCount: number,
): bigint {
  // inverse power square law
  return (
    (BigInt(swarmCount) * fluxEmitted) /
    BigInt(4 * Math.PI * Number(reflectionOrbitSurfaceRadius ** 2n))
  );
  // Before refactoring the above expression, please consider the following:
  // As a general rule, attempt to minimize loss of information/precision incurred from necessary conversions
  // to and from floating-point numbers.
  // Prioritize multiplications between bigints, to grow the quantities manipulated (and conversely proportionally
  // shrink the remainder from an arbitrary division by a smaller divisor).
  // Thus, delay division until dividing the largest bigint possible.
  // Here we convert to floating-point once, to multiply by pi (which would "lose" ~4.5% of its precision if it was
  // directly converted to a bigint) and then immediately convert back to bigint for the final result.
  // Depending on the bounds of the quantities involved (concretely, number of consecutive zeroes immediately before the
  // decimal point in base 10 representation), it could be advantageous to instead:
  //   1. multiply the quantity by some power of ten
  //   2. multiply PI by that same quantity (for example, 10**6 for 8e-5% error)
  //   3. divide these two multiplication results for the final ratio [with less error]
}

export function swarmProcess(
  swarm: SatelliteSwarm,
  inbox: BusEvent[],
): [SatelliteSwarm, BusEvent[]] {
  let event,
    emitted = [] as BusEvent[];
  while ((event = inbox.shift())) {
    switch (event.tag) {
      case "star-flux-emission":
      case "launch-satellite":
        swarm.data.received.push(event);
        break;
      case "simulation-clock-tick": {
        swarm.data.received.sort(compareReceivedTicks);

        const { tick } = event;
        const futureStart = indexOfFirstFutureEvent(swarm.data.received, tick);

        const [launched, flux] = swarm.data.received
          .slice(0, futureStart)
          .reduce(
            ([launched, flux], e) => {
              if (e.tag === "launch-satellite") {
                return [
                  launched + (e?.count ?? 1) /* backwards compat */,
                  flux,
                ];
              } else {
                return [
                  launched,
                  flux +
                    fluxReflected(
                      e.flux,
                      swarm.data?.averageDistanceFromStar ??
                        MERCURY_SEMIMAJOR_AXIS_M,
                      swarm.data.count,
                    ),
                ];
              }
            },
            [0, 0n],
          );

        swarm.data.count += launched;

        if (flux > 0n) {
          emitted.push({
            tag: "satellite-flux-reflection",
            flux, // 100% reflection (for now?)
            receivedTick: tick + 1,
          });
        }

        swarm.data.received =
          futureStart === undefined
            ? []
            : swarm.data.received.slice(futureStart);
        break;
      }
    }
  }
  return [swarm, emitted];
}
export function swarmCount(simulation: Simulation): number {
  return (
    (simulation.processors?.get("swarm-0") as SatelliteSwarm)?.data.count ?? 0
  );
}
