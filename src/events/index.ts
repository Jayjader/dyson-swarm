import type { Id, Processor } from "./processing";
import {
  clockProcess,
  collectorProcess,
  createClock,
  createMemoryStream,
  memoryStreamProcess,
  processMiner,
  processPowerGrid,
  starProcess,
} from "./processing";
import type { Event, EventTag } from "./events";

type EventBus = {
  subscriptions: Map<EventTag, Set<Id>>;
};
export type Simulation = {
  bus: EventBus;
  processors: Map<Id, Processor & { id: Id }>;
};
export const SUBSCRIPTIONS = {
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
    "star-flux-emission",
    "collector-power-production",
    "draw-power",
    "supply-power",
    "mine-planet-surface",
  ] as const),
  clock: new Set([
    "outside-clock-tick",
    "command-simulation-clock-play",
    "command-simulation-clock-pause",
    "command-simulation-clock-indirect-pause",
    "command-simulation-clock-indirect-resume",
  ] as const),
  star: new Set(["simulation-clock-tick"] as const),
  planet: new Set([] as const),
  collector: new Set(["star-flux-emission", "simulation-clock-tick"] as const),
  "power grid": new Set([
    "collector-power-production",
    "simulation-clock-tick",
    "draw-power",
  ] as const),
  miner: new Set(["simulation-clock-tick", "supply-power"] as const),
} as const;
export type SubscriptionsFor<ProcessorTag> =
  ProcessorTag extends keyof typeof SUBSCRIPTIONS
    ? typeof SUBSCRIPTIONS[ProcessorTag] extends Set<infer U>
      ? U
      : never
    : never;
export type HasSubscription<Tag extends string> =
  Tag extends keyof typeof SUBSCRIPTIONS ? {} : never;

type SaveState = { processors: Processor[] };

export function insertProcessor(sim: Simulation, p: Processor) {
  SUBSCRIPTIONS[p.tag].forEach((eventTag) =>
    sim.bus.subscriptions.set(
      eventTag,
      (sim.bus.subscriptions.get(eventTag) ?? new Set()).add(p.id)
    )
  );
  sim.processors.set(p.id, p);
}

export function broadcastEvent(sim: Simulation, event: Event): Simulation {
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

function process(p: Processor): [Processor, Event[]] {
  switch (p.tag) {
    case "stream":
      return [memoryStreamProcess(p), []];
    case "clock":
      return clockProcess(p);
    case "star":
      return starProcess(p);
    case "planet":
      return [p, []];
    case "collector":
      return collectorProcess(p);
    case "power grid":
      return processPowerGrid(p);
    case "miner":
      return processMiner(p);
  }
  console.error({
    command: "process",
    processor: p,
    message: "process function not implemented",
  });
}

export function processUntilSettled(sim: Simulation): Simulation {
  while ([...sim.processors.values()].some((p) => p.incoming.length > 0)) {
    const emitted = [] as Event[];
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
  return { processors: [] };
}
