import { type Readable, writable } from "svelte/store";
import { Resource } from "../gameRules";
import type { BusEvent, EventTag } from "./events";
import type { Id, Processor } from "./processes";
import { clockProcess, createClock } from "./processes/clock";
import {
  collectorProcess,
  createCollectorManager,
} from "./processes/collector";
import {
  createMemoryStream,
  type EventStream,
  memoryStreamProcess,
  parseStream,
  type SerializedStream,
} from "./processes/eventStream";
import { createFabricator, fabricatorProcess } from "./processes/fabricator";
import { createLauncherManager, launcherProcess } from "./processes/launcher";
import { createMinerManager, minerProcess } from "./processes/miner";
import { createPlanet, planetProcess } from "./processes/planet";
import { createPowerGrid, powerGridProcess } from "./processes/powerGrid";
import { createRefinerManager, refinerProcess } from "./processes/refiner";
import { createSwarm, swarmProcess } from "./processes/satelliteSwarm";
import { createFactoryManager, factoryProcess } from "./processes/satFactory";
import { createStar, starProcess } from "./processes/star";
import { createStorage, storageProcess } from "./processes/storage";
import { SUBSCRIPTIONS } from "./subscriptions";

type EventBus = {
  subscriptions: Map<EventTag, Set<Id>>;
};
export type Simulation = {
  bus: EventBus;
  processors: Map<Id, Processor & { id: Id }>;
};

export type Others = Exclude<Processor, EventStream>;
export type SaveState = { stream: SerializedStream; processors: Others[] };

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

export function loadSave(save: SaveState): Simulation {
  const stream = parseStream(save.stream);
  const flatSubs = save.processors
    .flatMap((p) =>
      [...SUBSCRIPTIONS[p.tag]].map<[EventTag, Id]>((tag) => [tag, p.id])
    )
    .concat(
      [...SUBSCRIPTIONS.stream].map<[EventTag, Id]>((tag) => [tag, stream.id])
    );
  const subsByTag = flatSubs.reduce<Map<EventTag, Set<Id>>>(
    (accu, [tag, id]) => accu.set(tag, (accu.get(tag) ?? new Set()).add(id)),
    new Map()
  );
  const procs: Array<[Id, Processor]> = [
    [stream.id, stream],
    ...save.processors.map<[Id, Processor]>((p) => [p.id, p]),
  ];
  const processorsById = new Map(procs);
  save.processors;
  return {
    bus: {
      subscriptions: subsByTag,
    },
    processors: processorsById,
  };
}

export function generateSave(sim: Simulation): SaveState {
  const processors = [];
  let stream!: SerializedStream;
  for (const proc of sim.processors.values()) {
    if (proc.tag !== "stream") {
      processors.push(proc);
      continue;
    }
    stream = {
      data: {
        unfinishedTick: proc.data.unfinishedTick,
        received: [...proc.data.received],
      },
      tag: proc.tag,
      id: proc.id,
      incoming: proc.incoming,
    };
  }
  console.debug({ saveStream: stream });
  return { processors, stream: stream };
}

export function newGame(): Processor[] {
  return [
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
  ];
}

export const SIMULATION_STORE = Symbol();

export function makeSimulationStore(): Readable<Simulation> & {
  processUntilSettled: () => void;
  broadcastEvent: (e: BusEvent) => void;
  loadSave: (s: SaveState) => void;
  loadNew: (outsideTick: DOMHighResTimeStamp) => void;
} {
  const { subscribe, update, set } = writable<Simulation>({
    bus: { subscriptions: new Map() },
    processors: new Map(),
  });
  return {
    subscribe,
    processUntilSettled: () => update((sim) => processUntilSettled(sim)),
    broadcastEvent: (e) => update((sim) => broadcastEvent(sim, e)),
    loadSave: (s) => set(loadSave(s)),
    loadNew: (outsideTick) => {
      const simulation = {
        bus: { subscriptions: new Map() },
        processors: new Map(),
      };
      newGame().forEach((p) => {
        insertProcessor(simulation, p);
      });
      insertProcessor(
        simulation,
        createClock(outsideTick, "clock-0", { mode: "pause" })
      );
      insertProcessor(simulation, createMemoryStream());
      set(simulation);
    },
  };
}
