import { get, type Readable, writable } from "svelte/store";
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
import { type EventPersistenceAdapter } from "./persistence";
import type { SnapshotsAdapter } from "./snapshots";
import type { EventSourcesAdapter } from "./eventSources";
import type { EventsQueryAdapter } from "./query";

type EventBus = {
  subscriptions: Map<EventTag, Set<Id>>;
};
export type Simulation = {
  bus: EventBus;
  processors: Map<Id, Processor & { id: Id }>;
};

export function insertProcessor(
  sim: Simulation,
  p: Processor,
  sourcesAdapter: EventSourcesAdapter,
) {
  sourcesAdapter.insertSource(p.id, p);
  for (let eventTag of SUBSCRIPTIONS[p.tag]) {
    const subscribedSources = sim.bus.subscriptions.get(eventTag);
    if (subscribedSources === undefined) {
      sim.bus.subscriptions.set(eventTag, new Set([p.id]));
    } else {
      subscribedSources.add(p.id); // todo-longterm: check if this breaks svelte reactivity
    }
  }
}

export function broadcastEvent(
  sim: Simulation,
  event: BusEvent,
  eventPersistenceAdapter: EventPersistenceAdapter,
): Simulation {
  eventPersistenceAdapter.persistEvent(event);
  const subscribedToEvent = sim.bus.subscriptions.get(event.tag);
  if (subscribedToEvent) {
    for (let id of subscribedToEvent) {
      eventPersistenceAdapter.deliverEvent(event, id);
    }
  }
  return sim;
}

function process(p: Processor, inbox: BusEvent[]): [Processor, BusEvent[]] {
  switch (p.tag) {
    case "stream":
      return [memoryStreamProcess(p), []];
    case "clock":
      return clockProcess(p);
    case "star":
      return starProcess(p, inbox);
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

export async function processUntilSettled(
  sim: Simulation,
  adapters: {
    snapshotsAdapter: SnapshotsAdapter;
    eventsReadAdapter: EventsQueryAdapter;
    eventsWriteAdapter: EventPersistenceAdapter;
  },
): Promise<Simulation> {
  while ((await adapters.eventsReadAdapter.getTotalInboxSize()) > 0) {
    const emitted = [] as BusEvent[];
    for (let processor of sim.processors.values()) {
      const inbox = await adapters.eventsReadAdapter.getInbox(processor.id);
      if (inbox.length > 0) {
        const [updatedProcessor, newEmitted] = process(processor, inbox);
        emitted.push(...newEmitted);
        adapters.snapshotsAdapter.persistSnapshot(
          updatedProcessor.lastTick,
          updatedProcessor.id,
          updatedProcessor.data,
        );
        break;
      }
    }
    for (let event of emitted) {
      broadcastEvent(sim, event, adapters.eventsWriteAdapter);
    }
  }
  return sim;
}

export const SIMULATION_STORE = Symbol();

export function makeSimulationStore(
  objectives: ObjectiveTracker,
  adapters: {
    snapshotsAdapter: SnapshotsAdapter;
    eventSourcesAdapter: EventSourcesAdapter;
    eventsReadAdapter: EventsQueryAdapter;
    eventsWriteAdapter: EventPersistenceAdapter;
  },
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
      update((sim) => broadcastEvent(sim, e, adapters.eventsWriteAdapter)),
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
        insertProcessor(simulation, processor, adapters.eventSourcesAdapter);
      }
      insertProcessor(
        simulation,
        createClock(outsideTick, "clock-0", { mode: "pause" }),
        adapters.eventSourcesAdapter,
      );
      insertProcessor(
        simulation,
        createMemoryStream(),
        adapters.eventSourcesAdapter,
      );
      insertProcessor(
        simulation,
        createObjectiveTrackerProbe(objectives.handleTriggers),
        adapters.eventSourcesAdapter,
      );
      set(simulation);
      return store;
    },
  };
  return store;
}

export type SimulationStore = ReturnType<typeof makeSimulationStore>;
