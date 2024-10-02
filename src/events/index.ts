import { get, type Readable, writable } from "svelte/store";
import { Resource } from "../gameRules";
import { type BusEvent, type EventTag, getTick } from "./events";
import { type Id, type Processor, tagFromId } from "./processes";
import { type Clock, clockProcess, createClock } from "./processes/clock";
import { type CollectorManager, collectorProcess } from "./processes/collector";
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
};

export async function insertProcessor(
  sim: Simulation,
  p: Processor,
  adapters: Adapters,
) {
  await adapters.eventSources.insertSource(p.core.id);
  await adapters.snapshots.persistSnapshot(p.core.lastTick, p.core.id, p.data);
  for (let eventTag of SUBSCRIPTIONS[p.core.tag]) {
    const subscribedSources = sim.bus.subscriptions.get(eventTag);
    if (subscribedSources === undefined) {
      sim.bus.subscriptions.set(eventTag, new Set([p.core.id]));
    } else {
      subscribedSources.add(p.core.id); // todo-longterm: check if this breaks svelte reactivity
    }
  }
}

export async function broadcastEvent(
  sim: Simulation,
  event: BusEvent,
  adapters: Adapters,
): Promise<Simulation> {
  await adapters.events.write.persistEvent(event);
  const subscribedToEvent = sim.bus.subscriptions.get(event.tag);
  if (subscribedToEvent) {
    for (let id of subscribedToEvent) {
      await adapters.events.write.deliverEvent(event, id);
    }
  }
  return sim;
}
export async function tickClock(
  tick: number,
  simulation: Simulation,
  adapters: Adapters,
): Promise<Simulation> {
  await broadcastEvent(
    simulation,
    {
      tag: "simulation-clock-tick",
      tick,
    },
    adapters,
  );
  return simulation;
}

function process(p: Processor, inbox: BusEvent[]): [Processor, BusEvent[]] {
  switch (p.core.tag) {
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
        const inboxTick = getTick(inbox[0])!;
        const [lastTick, data] =
          await adapters.snapshots.getLastSnapshot(processorId);
        const core = {
          id: processorId,
          tag: tagFromId(processorId),
          lastTick,
        };
        const [updatedProcessor, newEmitted] = process(
          { core, data } as Processor,
          inbox,
        );
        emitted.push(...newEmitted);
        await adapters.snapshots.persistSnapshot(
          inboxTick ?? lastTick,
          processorId,
          updatedProcessor.data,
        );
        break;
      }
    }
    for (let event of emitted) {
      await broadcastEvent(sim, event, adapters);
    }
  }
  return sim;
}

export const SIMULATION_STORE = Symbol();

export type SimulationStore = Readable<Simulation> & {
  processUntilSettled: () => Promise<void>;
  broadcastEvent: (e: BusEvent) => Promise<void>;
  tickClock: (t: number) => Promise<void>;
  loadSave: (s: SaveState) => Promise<void>;
  loadNew: (outsideTick: DOMHighResTimeStamp) => Promise<void>;
  adapters: Adapters;
  objectives: ObjectiveTracker;
};
export function makeSimulationStore(
  objectives: ObjectiveTracker,
  adapters: Adapters,
): SimulationStore {
  const baseData = writable<Simulation>({
    bus: { subscriptions: new Map() },
  });
  const { subscribe, set } = baseData;
  return {
    subscribe,
    processUntilSettled: async () => {
      const sim = get(baseData);
      const settled = await processUntilSettled(sim, adapters);
      set(settled);
    },
    // todo-long-term: investigate renaming as createDivergentTimeline / createUserIntervention / etc...
    broadcastEvent: async (e: BusEvent) => {
      const sim = get(baseData);
      const broadcasted = await broadcastEvent(sim, e, adapters);
      set(broadcasted);
    },
    tickClock: async (t: number) => {
      const sim = get(baseData);
      const ticked = await tickClock(t, sim, adapters);
      set(ticked);
    },
    loadSave: async (s: SaveState) => {
      set(await loadSave(s, adapters));
    },
    loadNew: async (outsideTick: DOMHighResTimeStamp) => {
      const simulation = {
        bus: { subscriptions: new Map() },
      };
      for (let processor of newGame()) {
        await insertProcessor(simulation, processor, adapters);
      }
      // todo: remove this once the refactoring out of the clock processor type is finished
      await insertProcessor(
        simulation,
        createClock(outsideTick, "clock-0", { mode: "pause" }),
        adapters,
      );
      /*
      // todo: remove this once the refactoring of the objectives is finished
      insertProcessor(
        simulation,
        createObjectiveTrackerProbe(objectives.handleTriggers),
        adapters,
      );
*/
      set(simulation);
    },
    adapters,
    objectives,
  };
}
