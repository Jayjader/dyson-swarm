import {
  type EventStream,
  parseStream,
  type SerializedStream,
} from "../events/processes/eventStream";
import type { Id, Processor } from "../events/processes";
import { SUBSCRIPTIONS } from "../events/subscriptions";
import type { EventTag } from "../events/events";
import { createPowerGrid } from "../events/processes/powerGrid";
import { createStorage } from "../events/processes/storage";
import { Resource } from "../gameRules";
import { createStar } from "../events/processes/star";
import { createPlanet } from "../events/processes/planet";
import { createCollectorManager } from "../events/processes/collector";
import { createMinerManager } from "../events/processes/miner";
import { createRefinerManager } from "../events/processes/refiner";
import { createFactoryManager } from "../events/processes/satFactory";
import { createLauncherManager } from "../events/processes/launcher";
import { createSwarm } from "../events/processes/satelliteSwarm";
import { createFabricator } from "../events/processes/fabricator";
import type { Simulation } from "../events";
import { type Save, type SaveStub, Slot, slotStorageKey } from "./uiStore";

export type Others = Exclude<Processor, EventStream>;
export type SaveState = { stream: SerializedStream; processors: Others[] };

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
  const processorsById = new Map([
    [stream.id, stream],
    ...save.processors.map<[Id, Processor]>((p) => [p.id, p]),
  ]);
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

export function readSave(name: string, storage: Storage): null | SaveState {
  const data = storage.getItem(slotStorageKey(Slot.NAME)(name));
  return data === null ? null : parseProcessors(data);
}

export function parseProcessors(formatted: string): SaveState {
  return JSON.parse(formatted) as SaveState;
}

export function formatProcessors(procs: SaveState): string {
  return JSON.stringify(procs);
}

export function writeSlotToStorage(save: Save, storage: Storage) {
  const formattedSave = formatProcessors({
    stream: save.stream,
    processors: save.processors,
  });
  const saveKey = slotStorageKey(
    save.name === "AUTOSAVE" ? Slot.AUTO : Slot.NAME
  )(save.name);
  storage.setItem(saveKey, formattedSave);
  if (save.name !== "AUTOSAVE") {
    const NAMES_KEY = slotStorageKey(Slot.NAMES)("useless-string");
    const names = storage.getItem(NAMES_KEY);
    const namesArray = new Set(names === null ? [] : JSON.parse(names));
    namesArray.add(save.name);
    storage.setItem(NAMES_KEY, JSON.stringify([...namesArray]));
  }
}

export function writeSaveDataToBlob(
  save: SaveStub & SaveState,
  root: Document
): void {
  // todo: move link creation out of function; directly take link as argument
  const machineDrivenLink = root.createElement("a");
  const formattedSave = formatProcessors({
    stream: save.stream,
    processors: save.processors,
  });
  const blobData = encodeURIComponent(formattedSave);
  machineDrivenLink.setAttribute(
    "href",
    `data:text/plain;charset=utf-8,${blobData}`
  );
  machineDrivenLink.setAttribute("download", save.name);
  machineDrivenLink.click();
}

export function deleteSave(storage: Storage, name: string): void {
  const saveKey = slotStorageKey(name === "AUTOSAVE" ? Slot.AUTO : Slot.NAME)(
    name
  );
  storage.removeItem(saveKey);
  if (name !== "AUTOSAVE") {
    const NAMES_KEY = slotStorageKey(Slot.NAMES)("useless-string");
    const names = storage.getItem(NAMES_KEY);
    const namesArray = new Set(names === null ? [] : JSON.parse(names));
    namesArray.delete(name);
    storage.setItem(NAMES_KEY, JSON.stringify([...namesArray]));
  }
}
