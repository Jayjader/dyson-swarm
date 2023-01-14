import type { Id, Processor } from "./processes";
import type { BusEvent, EventTag } from "./events";
import { Resource } from "../gameRules";
import { createStorage, storageProcess } from "./processes/storage";
import { clockProcess, createClock } from "./processes/clock";
import { createPowerGrid, powerGridProcess } from "./processes/powerGrid";
import { createMinerManager, minerProcess } from "./processes/miner";
import { createPlanet, planetProcess } from "./processes/planet";
import { createRefinerManager, refinerProcess } from "./processes/refiner";
import { createStar, starProcess } from "./processes/star";
import {
  collectorProcess,
  createCollectorManager,
} from "./processes/collector";
import { createFactoryManager, factoryProcess } from "./processes/satFactory";
import { createLauncherManager, launcherProcess } from "./processes/launcher";
import { createSwarm, swarmProcess } from "./processes/satelliteSwarm";
import { createFabricator, fabricatorProcess } from "./processes/fabricator";
import { writable } from "svelte/store";
import {
  createMemoryStream,
  memoryStreamProcess,
} from "./processes/eventStream";

type EventBus = {
  subscriptions: Map<EventTag, Set<Id>>;
};
export type Simulation = {
  bus: EventBus;
  processors: Map<Id, Processor & { id: Id }>;
};
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
  ] as const),
  stream: new Set([
    "outside-clock-tick",
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
// export type HasSubscription<Tag extends string> =
//   Tag extends keyof typeof SUBSCRIPTIONS ? Tag : never;

export type SaveState = { processors: Processor[] };

export function insertProcessor(sim: Simulation, p: Processor) {
  SUBSCRIPTIONS[p.tag].forEach((eventTag) =>
    sim.bus.subscriptions.set(
      eventTag,
      (sim.bus.subscriptions.get(eventTag) ?? new Set()).add(p.id)
    )
  );
  sim.processors.set(p.id, p);
}

export function broadcastEvent(sim: Simulation, event: BusEvent): Simulation {
  const processorIds = sim.bus.subscriptions.get(event.tag);
  if (processorIds) {
    for (let id of processorIds) {
      const processor = sim.processors.get(id) as Processor;
      // we know this processor is subscribed to this event because we got its id from the event Tag's registered subscriptions
      // @ts-ignore
      processor.incoming.push(event);
      sim.processors.set(id, processor);
    }
  }
  return sim;
}

function process(p: Processor): [Processor, BusEvent[]] {
  switch (p.tag) {
    case "stream":
      return [memoryStreamProcess(p), []];
    case "clock":
      return clockProcess(p);
    case "star":
      return starProcess(p);
    case "planet":
      return planetProcess(p);
    case "collector":
      return collectorProcess(p);
    case "power grid":
      return powerGridProcess(p);
    case "storage-ore":
      return storageProcess(Resource.ORE, p);
    case "storage-metal":
      return storageProcess(Resource.METAL, p);
    case "storage-satellite":
      return storageProcess(Resource.PACKAGED_SATELLITE, p);
    case "miner":
      return minerProcess(p);
    case "refiner":
      return refinerProcess(p);
    case "factory":
      return factoryProcess(p);
    case "launcher":
      return launcherProcess(p);
    case "swarm":
      return swarmProcess(p);
    case "fabricator":
      return fabricatorProcess(p);
  }
  console.error({
    command: "process",
    processor: p,
    message: "process function not implemented",
  });
  return [p, []];
}

export function processUntilSettled(sim: Simulation): Simulation {
  while ([...sim.processors.values()].some((p) => p.incoming.length > 0)) {
    const emitted = [] as BusEvent[];
    for (let processor of sim.processors.values()) {
      const [updatedProcessor, newEmitted] = process(processor);
      sim.processors.set(updatedProcessor.id, updatedProcessor);
      emitted.push(...newEmitted);
    }
    for (let event of emitted) {
      broadcastEvent(sim, event);
    }
  }
  return sim;
}

export function loadSave(
  save: SaveState,
  options: Partial<{
    enforce: Partial<{ clock: boolean; stream: boolean }>;
  }> = {}
): Simulation {
  const flatSubs = save.processors.flatMap((p) =>
    [...SUBSCRIPTIONS[p.tag]].map<[EventTag, Id]>((tag) => [tag, p.id])
  );
  const subsByTag = flatSubs.reduce<Map<EventTag, Set<Id>>>(
    (accu, [tag, id]) => accu.set(tag, (accu.get(tag) ?? new Set()).add(id)),
    new Map()
  );
  const simulation = {
    bus: {
      subscriptions: subsByTag,
    },
    processors: new Map(save.processors.map((p) => [p.id, p])),
  };
  if (
    options?.enforce?.stream &&
    ![...simulation.processors.values()].some((p) => p.tag === "stream")
  ) {
    insertProcessor(simulation, createMemoryStream());
  }
  if (
    options?.enforce?.clock &&
    ![...simulation.processors.values()].some((p) => p.tag === "clock")
  ) {
    insertProcessor(simulation, createClock(window.performance.now()));
  }
  return simulation;
}

export function generateSave(sim: Simulation): SaveState {
  return { processors: [...sim.processors.values()] };
}

export function blankSave(): SaveState {
  return {
    processors: [
      createPowerGrid({ stored: 22 ** 2 }),
      createStorage(Resource.ORE),
      createStorage(Resource.METAL, { stored: 200 }),
      createStorage(Resource.PACKAGED_SATELLITE),
      createStar(),
      createPlanet(),
      createCollectorManager({ count: 15 }),
      createMinerManager(),
      createRefinerManager(),
      createFactoryManager(),
      createLauncherManager(),
      createSwarm(),
      createFabricator(),
    ],
  };
}

export const SIMULATION_STORE = Symbol();

export function makeSimulationStore() {
  const { subscribe, update, set } = writable<Simulation>({
    bus: { subscriptions: new Map() },
    processors: new Map(),
  });
  return {
    subscribe,
    insertProcessors: (...processors: Processor[]) =>
      update((sim) => {
        processors.forEach((p) => insertProcessor(sim, p));
        return sim;
      }),
    processUntilSettled: () => update((sim) => processUntilSettled(sim)),
    broadcastEvent: (e: BusEvent) => update((sim) => broadcastEvent(sim, e)),
    loadSave: (s: SaveState) => set(loadSave(s)),
  };
}
