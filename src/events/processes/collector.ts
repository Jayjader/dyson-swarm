import { Construct, MERCURY_SEMIMAJOR_AXIS_M, Resource } from "../../gameRules";
import type { BusEvent, Events } from "../events";
import { compareReceivedTicks, indexOfFirstFutureEvent } from "../events";
import type { Simulation } from "../index";
import type { SubscriptionsFor } from "../subscriptions";
import type { EventProcessor } from "./index";

export type CollectorManager = EventProcessor<
  "collector",
  {
    count: number;
    received: Events<
      Exclude<SubscriptionsFor<"collector">, "simulation-clock-tick">
    >[];
  }
>;

export function createCollectorManager(
  options: Partial<{
    id: CollectorManager["id"];
    count: number;
  }> = {}
): CollectorManager {
  const values = {
    id: "collector-0" as CollectorManager["id"],
    count: 0,
    ...options,
  };
  return {
    id: values.id,
    incoming: [],
    tag: "collector",
    data: { count: values.count, received: [] },
  };
}

export const SOLAR_COLLECTOR_PRODUCTION_EFFICIENCY = {
  numerator: 20n,
  denominator: 100n,
} as const;

export function fluxReceived(
  fluxEmitted: bigint,
  absorptionSurfaceOrbitRadius: bigint,
  collectorCount: number
): bigint {
  return (
    // inverse square power law
    (BigInt(collectorCount) * fluxEmitted) /
    BigInt(4 * Math.PI * Number(absorptionSurfaceOrbitRadius ** 2n))
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
  //   3. divide these two multiplication results for the same final ratio [with less error]
}

export function collectorProcess(
  c: CollectorManager
): [CollectorManager, BusEvent[]] {
  let event;
  const emitted = [] as BusEvent[];
  while ((event = c.incoming.shift())) {
    switch (event.tag) {
      case "construct-fabricated":
        if (event.construct !== Construct.SOLAR_COLLECTOR) {
          break;
        }
      case "star-flux-emission":
      case "satellite-flux-reflection":
        c.data.received.push(event);
        break;
      case "simulation-clock-tick": {
        c.data.received.sort(compareReceivedTicks);

        const { tick } = event;
        const firstFutureEventIndex = indexOfFirstFutureEvent(
          c.data.received,
          tick
        );

        const received = c.data.received.slice(0, firstFutureEventIndex).reduce(
          (sum, e) => {
            if (e.tag === "construct-fabricated") {
              sum.fabricated += 1;
            } else {
              if (e.tag === "satellite-flux-reflection") {
                // satellites are close enough for us to consider the flux they reflect is received 1-for-1
                sum.flux += e.flux;
              } else {
                sum.flux += fluxReceived(
                  e.flux,
                  MERCURY_SEMIMAJOR_AXIS_M, // collectors are on mercury's surface (for now)
                  c.data.count
                );
              }
            }
            return sum;
          },
          { flux: 0n, fabricated: 0 }
        );

        c.data.count += received.fabricated;

        const produced = BigInt(
          (SOLAR_COLLECTOR_PRODUCTION_EFFICIENCY.numerator * received.flux) /
            SOLAR_COLLECTOR_PRODUCTION_EFFICIENCY.denominator
        );
        if (produced > 0) {
          emitted.push({
            tag: "produce",
            resource: Resource.ELECTRICITY,
            amount: produced,
            receivedTick: tick + 1,
          });
        }

        c.data.received =
          firstFutureEventIndex === undefined
            ? []
            : c.data.received.slice(firstFutureEventIndex);
        break;
      }
    }
  }
  return [c, emitted];
}

export function getCollectorCount(simulation: Simulation): number {
  return (
    (simulation.processors.get("collector-0") as CollectorManager | undefined)
      ?.data.count ?? 0
  );
}
