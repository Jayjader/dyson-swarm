import { Resource } from "../gameRules";

export const SUBSCRIPTIONS = {
  clock: new Set([
    "outside-clock-tick",
    "command-simulation-clock-play",
    "command-simulation-clock-pause",
    "command-simulation-clock-indirect-pause",
    "command-simulation-clock-indirect-resume",
    "command-simulation-clock-start-editing-speed",
    "command-simulation-clock-set-speed",
  ] as const),
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
  stream: new Set([
    "simulation-clock-tick",
    "command-simulation-clock-play",
    "simulation-clock-play",
    "command-simulation-clock-pause",
    "simulation-clock-pause",
    "command-simulation-clock-indirect-pause",
    "simulation-clock-indirect-pause",
    "command-simulation-clock-indirect-resume",
    "simulation-clock-indirect-resume",
    "command-simulation-clock-start-editing-speed",
    "simulation-clock-editing-speed",
    "command-simulation-clock-set-speed",
    "simulation-clock-new-speed",
    "star-flux-emission",
    "mine-planet-surface",
    "draw",
    "supply",
    "produce",
    "launch-satellite",
    "satellite-flux-reflection",
    "construct-fabricated",
    "circuit-breaker-tripped",
    "command-reset-circuit-breaker",
    "circuit-breaker-reset",
    "command-trip-circuit-breaker",
    "command-set-working-count",
    "working-count-set",
    "command-set-fabricator-queue",
    "fabricator-queue-set",
    "command-clear-fabricator-job",
  ] as const),
} as const;
export type SubscriptionsFor<ProcessorTag> =
  ProcessorTag extends keyof typeof SUBSCRIPTIONS
    ? typeof SUBSCRIPTIONS[ProcessorTag] extends Set<infer U>
      ? U
      : never
    : never;
