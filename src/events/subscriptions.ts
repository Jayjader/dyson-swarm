import { Resource } from "../gameRules";

export const SUBSCRIPTIONS = {
  star: new Set(["simulation-clock-tick"] as const),
  planet: new Set(["mine-planet-surface", "simulation-clock-tick"] as const),
  collector: new Set([
    "star-flux-emission",
    "satellite-flux-reflection",
    "simulation-clock-tick",
    "construct-fabricated",
  ] as const),
  "power grid": new Set([
    "simulation-clock-tick",
    "command-reset-circuit-breaker",
    "command-trip-circuit-breaker",
    "produce",
    "draw",
  ] as const),
  miner: new Set([
    "simulation-clock-tick",
    "supply",
    "construct-fabricated",
    "command-set-working-count",
  ] as const),
  [`storage-${Resource.ORE}`]: new Set([
    "simulation-clock-tick",
    "produce",
    "draw",
  ] as const),
  [`storage-${Resource.METAL}`]: new Set([
    "simulation-clock-tick",
    "produce",
    "draw",
  ] as const),
  [`storage-${Resource.PACKAGED_SATELLITE}`]: new Set([
    "simulation-clock-tick",
    "produce",
    "draw",
  ] as const),
  refiner: new Set([
    "simulation-clock-tick",
    "supply",
    "construct-fabricated",
    "command-set-working-count",
  ] as const),
  factory: new Set([
    "simulation-clock-tick",
    "supply",
    "construct-fabricated",
    "command-set-working-count",
  ] as const),
  launcher: new Set([
    "simulation-clock-tick",
    "supply",
    "construct-fabricated",
    "command-set-working-count",
  ] as const),
  swarm: new Set([
    "simulation-clock-tick",
    "launch-satellite",
    "star-flux-emission",
  ] as const),
  fabricator: new Set([
    "simulation-clock-tick",
    "supply",
    "command-set-fabricator-queue",
    "command-clear-fabricator-job",
    "command-turn-on-fabricator",
    "command-turn-off-fabricator",
  ] as const),
  probe: new Set([
    "command-set-fabricator-queue",
    "construct-fabricated",
  ] as const),
} as const;
export type SubscriptionsFor<ProcessorTag> =
  ProcessorTag extends keyof typeof SUBSCRIPTIONS
    ? (typeof SUBSCRIPTIONS)[ProcessorTag] extends Set<infer U>
      ? U
      : never
    : never;
