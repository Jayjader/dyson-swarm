import { get, type Readable, writable } from "svelte/store";
import { Resource } from "../gameRules";
import type { BusEvent, EventTag } from "./events";
import type { Id, Processor } from "./processes";
import { type Clock, clockProcess, createClock } from "./processes/clock";
import { type CollectorManager, collectorProcess } from "./processes/collector";
import {
  createMemoryStream,
  type EventStream,
  memoryStreamProcess,
} from "./processes/eventStream";
import { type Fabricator, fabricatorProcess } from "./processes/fabricator";
import { type LauncherManager, launcherProcess } from "./processes/launcher";
import { type MinerManager, minerProcess } from "./processes/miner";
import { type Planet, planetProcess } from "./processes/planet";
import { type PowerGrid, powerGridProcess } from "./processes/powerGrid";
import { type RefinerManager, refinerProcess } from "./processes/refiner";
import { type SatelliteSwarm, swarmProcess } from "./processes/satelliteSwarm";
import {
  factoryProcess,
  type SatelliteFactoryManager,
} from "./processes/satFactory";
import { type Star, starProcess } from "./processes/star";
import { type Storage, storageProcess } from "./processes/storage";
import { SUBSCRIPTIONS } from "./subscriptions";
import { loadSave, newGame, type SaveState } from "../save/save";
import {
  createObjectiveTrackerProbe,
  type ObjectiveTrackerProbe,
  objectiveTrackerProcess,
} from "./processes/objectiveTracker";
import type { ObjectiveTracker } from "../objectiveTracker/store";
import type { Adapters } from "../adapters";

type EventBus = {
  subscriptions: Map<EventTag, Set<Id>>;
};
export type Simulation = {
  bus: EventBus;
  processors: Map<Id, Processor>;
};

export function insertProcessor(
  sim: Simulation,
  p: Processor,
  adapters: Adapters,
) {
  adapters.eventSources.insertSource(p.core.id, p);
  for (let eventTag of SUBSCRIPTIONS[p.core.tag]) {
    const subscribedSources = sim.bus.subscriptions.get(eventTag);
    if (subscribedSources === undefined) {
      sim.bus.subscriptions.set(eventTag, new Set([p.core.id]));
    } else {
      subscribedSources.add(p.core.id); // todo-longterm: check if this breaks svelte reactivity
    }
  }
}

export function broadcastEvent(
  sim: Simulation,
  event: BusEvent,
  adapters: Adapters,
): Simulation {
  adapters.events.write.persistEvent(event);
  const subscribedToEvent = sim.bus.subscriptions.get(event.tag);
  if (subscribedToEvent) {
    for (let id of subscribedToEvent) {
      adapters.events.write.deliverEvent(event, id);
    }
  }
  return sim;
}

function process(p: Processor, inbox: BusEvent[]): [Processor, BusEvent[]] {
  switch (p.core.tag) {
    case "stream":
      return [memoryStreamProcess(p as EventStream, inbox), []];
    case "clock":
      return clockProcess(p as Clock, inbox);
    case "star":
      return starProcess(p as Star, inbox);
    case "planet":
      return planetProcess(p as Planet, inbox);
    case "collector":
      return collectorProcess(p as CollectorManager, inbox);
    case "power grid":
      return powerGridProcess(p as PowerGrid, inbox);
    case "storage-ore":
      return storageProcess(Resource.ORE, p as Storage<"ore">, inbox);
    case "storage-metal":
      return storageProcess(Resource.METAL, p as Storage<"metal">, inbox);
    case "storage-satellite":
      return storageProcess(
        Resource.PACKAGED_SATELLITE,
        p as Storage<"satellite">,
        inbox,
      );
    case "miner":
      return minerProcess(p as MinerManager, inbox);
    case "refiner":
      return refinerProcess(p as RefinerManager, inbox);
    case "factory":
      return factoryProcess(p as SatelliteFactoryManager, inbox);
    case "launcher":
      return launcherProcess(p as LauncherManager, inbox);
    case "swarm":
      return swarmProcess(p as SatelliteSwarm, inbox);
    case "fabricator":
      return fabricatorProcess(p as Fabricator, inbox);
    case "probe":
      return objectiveTrackerProcess(p as ObjectiveTrackerProbe, inbox);
  }
  console.error({
    command: "process",
    processor: p,
    message: "process function not implemented",
  });
  return [p, []];
}

export async function processUntilSettled(
  sim: Simulation,
  adapters: Adapters,
): Promise<Simulation> {
  while ((await adapters.events.read.getTotalInboxSize()) > 0) {
    const emitted = [] as BusEvent[];
    for (let processorId of await adapters.eventSources.getAllSourceIds()) {
      const inbox = await adapters.events.read.getInbox(processorId);
      if (inbox.length > 0) {
        const processor = await adapters.snapshots.getLastSnapshot(processorId);
        const [updatedProcessor, newEmitted] = process(processor, inbox);
        emitted.push(...newEmitted);
        adapters.snapshots.persistSnapshot(
          updatedProcessor.core.lastTick,
          updatedProcessor.core.id,
          updatedProcessor.data,
        );
        break;
      }
    }
    for (let event of emitted) {
      broadcastEvent(sim, event, adapters);
    }
  }
  return sim;
}

export const SIMULATION_STORE = Symbol();

export function makeSimulationStore(
  objectives: ObjectiveTracker,
  adapters: Adapters,
): Readable<Simulation> & {
  processUntilSettled: () => void;
  broadcastEvent: (e: BusEvent) => void;
  loadSave: (s: SaveState) => SimulationStore;
  loadNew: (outsideTick: DOMHighResTimeStamp) => SimulationStore;
} {
  const baseData = writable<Simulation>({
    bus: { subscriptions: new Map() },
    processors: new Map(),
  });
  const { subscribe, update, set } = baseData;
  const store = {
    subscribe,
    processUntilSettled: async () => {
      const sim = get(baseData);
      const settled = await processUntilSettled(sim, adapters);
      set(settled);
    },
    broadcastEvent: (e: BusEvent) =>
      update((sim) => broadcastEvent(sim, e, adapters)),
    loadSave: (s: SaveState) => {
      set(loadSave(s));
      return store;
    },
    loadNew: (outsideTick: DOMHighResTimeStamp) => {
      const simulation = {
        bus: { subscriptions: new Map() },
        processors: new Map(),
      };
      for (let processor of newGame()) {
        insertProcessor(simulation, processor, adapters);
      }
      insertProcessor(
        simulation,
        createClock(outsideTick, "clock-0", { mode: "pause" }),
        adapters,
      );
      insertProcessor(simulation, createMemoryStream(), adapters);
      insertProcessor(
        simulation,
        createObjectiveTrackerProbe(objectives.handleTriggers),
        adapters,
      );
      set(simulation);
      return store;
    },
  };
  return store;
}

export type SimulationStore = ReturnType<typeof makeSimulationStore>;
