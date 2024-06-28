import { type Readable, writable } from "svelte/store";
import { Resource } from "../gameRules";
import type { BusEvent, EventTag } from "./events";
import type { Id, Processor } from "./processes";
import { clockProcess, createClock } from "./processes/clock";
import { collectorProcess } from "./processes/collector";
import {
  createMemoryStream,
  memoryStreamProcess,
} from "./processes/eventStream";
import { fabricatorProcess } from "./processes/fabricator";
import { launcherProcess } from "./processes/launcher";
import { minerProcess } from "./processes/miner";
import { planetProcess } from "./processes/planet";
import { powerGridProcess } from "./processes/powerGrid";
import { refinerProcess } from "./processes/refiner";
import { swarmProcess } from "./processes/satelliteSwarm";
import { factoryProcess } from "./processes/satFactory";
import { starProcess } from "./processes/star";
import { storageProcess } from "./processes/storage";
import { SUBSCRIPTIONS } from "./subscriptions";
import { loadSave, newGame, type SaveState } from "../save/save";
import {
  createObjectiveTrackerProbe,
  objectiveTrackerProcess,
} from "./processes/objectiveTracker";
import type { ObjectiveTracker } from "../objectiveTracker/store";
import {
  type EventPersistenceAdapter,
  sqlEventPersistenceAdapter,
} from "./persistence";
import { createSqlWorker } from "./sqlWorker";

type EventBus = {
  subscriptions: Map<EventTag, Set<Id>>;
};
export type Simulation = {
  bus: EventBus;
  processors: Map<Id, Processor & { id: Id }>;
};

export function insertProcessor(sim: Simulation, p: Processor) {
  SUBSCRIPTIONS[p.tag].forEach((eventTag) =>
    sim.bus.subscriptions.set(
      eventTag,
      (sim.bus.subscriptions.get(eventTag) ?? new Set()).add(p.id),
    ),
  );
  sim.processors.set(p.id, p);
}

export function broadcastEvent(
  sim: Simulation,
  event: BusEvent,
  eventPersistenceAdapter: EventPersistenceAdapter = sqlEventPersistenceAdapter(
    createSqlWorker(),
  ),
): Simulation {
  eventPersistenceAdapter.persistEvent(event);
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
    case "probe":
      return objectiveTrackerProcess(p);
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

export const SIMULATION_STORE = Symbol();

export function makeSimulationStore(
  objectives: ObjectiveTracker,
): Readable<Simulation> & {
  processUntilSettled: () => void;
  broadcastEvent: (e: BusEvent) => void;
  loadSave: (s: SaveState) => SimulationStore;
  loadNew: (outsideTick: DOMHighResTimeStamp) => SimulationStore;
} {
  const { subscribe, update, set } = writable<Simulation>({
    bus: { subscriptions: new Map() },
    processors: new Map(),
  });
  const store = {
    subscribe,
    processUntilSettled: () => update((sim) => processUntilSettled(sim)),
    broadcastEvent: (e: BusEvent) => update((sim) => broadcastEvent(sim, e)),
    loadSave: (s: SaveState) => {
      set(loadSave(s));
      return store;
    },
    loadNew: (outsideTick: DOMHighResTimeStamp) => {
      const simulation = {
        bus: { subscriptions: new Map() },
        processors: new Map(),
      };
      newGame().forEach((p) => {
        insertProcessor(simulation, p);
      });
      insertProcessor(
        simulation,
        createClock(outsideTick, "clock-0", { mode: "pause" }),
      );
      insertProcessor(simulation, createMemoryStream());
      insertProcessor(
        simulation,
        createObjectiveTrackerProbe(objectives.handleTriggers),
      );
      set(simulation);
      return store;
    },
  };
  return store;
}

export type SimulationStore = ReturnType<typeof makeSimulationStore>;
