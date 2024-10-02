import type { Id, Processor } from "../events/processes";
import { SUBSCRIPTIONS } from "../events/subscriptions";
import { type BusEvent, type EventTag, getTick } from "../events/events";
import { createPowerGrid } from "../events/processes/powerGrid";
import { createStorage } from "../events/processes/storage";
import { Construct, Resource } from "../gameRules";
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
import type { BuildOrder } from "../types";
import { isRepeat } from "../types";
import type { Adapters } from "../adapters";

export const versions = ["initial-json", "adapters-rewrite"] as const;
export type SaveState = {
  version: (typeof versions)[number];
  sources: Array<{ id: string; tag: string }>;
  snapshots: Array<{ id: string; tick: number; data: string }>;
  events: Array<BusEvent>;
  inboxes: Array<{ sourceId: string; events: BusEvent[] }>;
};

export type OldSaveState = {
  stream: {
    tag: "stream";
    id: `stream-${number}`;
    incoming: [];
    data: { unfinishedTick: number; received: Array<[number, BusEvent[]]> };
  };
  processors: Array<
    Processor["core"] & { data: Processor["data"]; incoming: [] }
  >;
};
export function migrateOldSave(save: OldSaveState): SaveState {
  const migrated: SaveState = {
    version: versions[1],
    sources: [],
    snapshots: [],
    events: [],
    inboxes: [],
  };
  for (const [_tick, events] of save.stream.data.received) {
    migrated.events.push(...events);
  }
  for (const processor of save.processors) {
    migrated.sources.push({ id: processor.id, tag: processor.tag });
    migrated.inboxes.push({
      sourceId: processor.id,
      events: processor.incoming,
    });
    migrated.snapshots.push({
      id: processor.id,
      tick: save.stream.data.unfinishedTick, // todo: check that this works, maybe try searching for last event emitted instead?
      data: SaveJSON.stringify(processor.data),
    });
  }
  return migrated;
}
export async function loadSave(
  save: SaveState,
  adapters: Adapters,
): Promise<Simulation> {
  const sim = { bus: { subscriptions: new Map<EventTag, Set<Id>>() } };
  for (const { id, tag } of save.sources) {
    if (SUBSCRIPTIONS[tag as keyof typeof SUBSCRIPTIONS] === undefined) {
      continue;
    }
    for (const eventTag of SUBSCRIPTIONS[tag as keyof typeof SUBSCRIPTIONS]) {
      const subsForEvent = sim.bus.subscriptions.get(eventTag);
      if (subsForEvent !== undefined) {
        subsForEvent.add(id as Id);
      } else {
        sim.bus.subscriptions.set(eventTag, new Set([id as Id]));
      }
    }
    let lastTick = Number.NEGATIVE_INFINITY,
      indexOfLastTick = 0;
    for (let i = 0; i < save.snapshots.length; i++) {
      const snapshot = save.snapshots[i];
      if (snapshot.id === id) {
        if (snapshot.tick > lastTick) {
          lastTick = snapshot.tick;
          indexOfLastTick = i;
        }
      }
    }
    let data;
    try {
      data = SaveJSON.parse(
        save.snapshots[indexOfLastTick].data,
      ) as Processor["data"];
    } catch (e) {
      console.error(`json error for snapshot of ${id}/${tag}: `, e);
    }
    if (lastTick === Number.NEGATIVE_INFINITY || data === undefined) {
      continue;
    }
    await adapters.eventSources.insertSource(id as Id);
    // todo: investigate persisting *each* snapshot
    await adapters.snapshots.persistSnapshot(lastTick, id as Id, data);
  }
  for (const event of save.events) {
    await adapters.events.write.persistEvent(event);
  }
  for (const { sourceId, events } of save.inboxes) {
    for (const event of events) {
      await adapters.events.write.deliverEvent(event, sourceId);
    }
  }
  return sim;
}

export async function generateSave(adapters: Adapters): Promise<SaveState> {
  const sources = [];
  for (const sourceId of await adapters.eventSources.getAllSourceIds()) {
    sources.push({
      id: sourceId,
      tag: sourceId.slice(0, sourceId.lastIndexOf("-")),
    });
  }
  const events = [];
  for (const [_, event] of await adapters.events.read.getTickEventsRange(
    Number.NEGATIVE_INFINITY,
  )) {
    events.push(event);
  }
  const inboxes = [];
  for (const { id } of sources) {
    inboxes.push({
      sourceId: id,
      events: await adapters.events.read.peekInbox(id),
    });
  }
  const snapshots = [];
  for (const [
    sourceId,
    tick,
    rawSnapshot,
  ] of await adapters.snapshots.getAllRawSnapshots()) {
    snapshots.push({ id: sourceId, tick, data: rawSnapshot });
  }
  return { version: versions[1], sources, events, inboxes, snapshots };
}

export function newGame(): Processor[] {
  return [
    createPowerGrid({ stored: 22n ** 2n }),
    createStorage(Resource.ORE),
    createStorage(Resource.METAL, { stored: 200n }),
    createStorage(Resource.PACKAGED_SATELLITE),
    createStar(),
    createPlanet(),
    createCollectorManager({ count: 15 }),
    createMinerManager(),
    createRefinerManager(),
    createFactoryManager(),
    createLauncherManager(),
    createSwarm(),
    createFabricator("fabricator-0", [
      { building: Construct.MINER },
      { building: Construct.REFINER },
    ]),
  ];
}

export function readSaveStateFromStorage(
  name: string,
  storage: Storage,
): null | SaveState {
  const data = storage.getItem(slotStorageKey(Slot.NAME)(name));
  if (data === null) {
    return null;
  }
  let parsed = SaveJSON.parse(data) as SaveState;
  if (parsed?.version === undefined || parsed?.version === "initial-json") {
    parsed = migrateOldSave(parsed as unknown as OldSaveState);
  }
  return parsed;
}

/**
 * `JSON.stringify` serializes `Infinity`s as `null`. This recurses over a BuildOrder array and replaces all `null` counts with Infinity
 * @param queue
 */
function convertNullBuildOrderCountsToInfinity(
  queue: BuildOrder[],
): BuildOrder[] {
  return queue.map((order) =>
    !isRepeat(order)
      ? order
      : {
          repeat: convertNullBuildOrderCountsToInfinity(order.repeat) as [
            BuildOrder,
            ...BuildOrder[],
          ],
          count: order.count ?? Number.POSITIVE_INFINITY,
        },
  );
}
const BIG_INT_PROPERTY_KEYS = ["charge", "flux", "amount", "stored", "mass"];
function saveFileFromJsonRestorer(key: string, value: any) {
  if (BIG_INT_PROPERTY_KEYS.includes(key)) {
    return BigInt(value);
  }
  if (key === "queue") {
    return convertNullBuildOrderCountsToInfinity(value);
  }
  return value;
}
function saveFileToJsonReplacer(key: string, value: any) {
  if (key.startsWith("probe")) {
    return undefined;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
type Savable = BusEvent | Processor["data"] | SaveState;
export const SaveJSON = {
  parse(formatted: string): Savable {
    return JSON.parse(formatted, saveFileFromJsonRestorer) as SaveState;
  },

  stringify(gameObject: Savable): string {
    return JSON.stringify(gameObject, saveFileToJsonReplacer);
  },
};

function stripNonCommandsInTicksOlderThan(
  ticksIntoThePast: number,
  events: BusEvent[],
): BusEvent[] {
  let oldestTick = Number.NEGATIVE_INFINITY;
  for (const event of events) {
    const tick = getTick(event);
    if (tick !== undefined && tick > oldestTick) {
      oldestTick = tick;
    }
  }
  return events.filter(
    (event) =>
      (getTick(event) ?? Number.POSITIVE_INFINITY) >=
        oldestTick - ticksIntoThePast && event.tag.startsWith("command"),
  );
}
export function writeSlotToStorage(save: Save, storage: Storage) {
  const { name, events, ...saveState } = save;
  const longEnoughToRebuildState = 5 * 60; // grab at least the last 5 seconds of all events (if at max clock speed)
  const formattedSave = SaveJSON.stringify({
    ...saveState,
    events: stripNonCommandsInTicksOlderThan(longEnoughToRebuildState, events),
  });
  const saveKey = slotStorageKey(
    save.name === "AUTOSAVE" ? Slot.AUTO : Slot.NAME,
  )(save.name);
  try {
    storage.setItem(saveKey, formattedSave);
  } catch (e) {
    // presume quota exceeded
    try {
      const hopefullyEnoughToDebugAnyErrors = 10; // 5 seconds (at 60t/s) is too big, so just grab 10 ticks
      const formattedSave = SaveJSON.stringify({
        ...saveState,
        events: stripNonCommandsInTicksOlderThan(
          hopefullyEnoughToDebugAnyErrors,
          events,
        ),
      });
      storage.setItem(saveKey, formattedSave);
    } catch (e) {
      // still too big for non-commands, but maybe we can still fit in *just* the commands
      const formattedSave = SaveJSON.stringify({
        ...saveState,
        events: stripNonCommandsInTicksOlderThan(0, events),
      });
      storage.setItem(saveKey, formattedSave);
    }
  }
  if (save.name !== "AUTOSAVE") {
    // update declared save slot names
    const NAMES_KEY = slotStorageKey(Slot.NAMES)("useless-string");
    const names = storage.getItem(NAMES_KEY);
    const namesArray = new Set(names === null ? [] : JSON.parse(names));
    namesArray.add(save.name);
    storage.setItem(NAMES_KEY, JSON.stringify([...namesArray]));
  }
}

export function writeSaveDataToBlob(
  save: SaveStub & SaveState,
  root: Document,
): void {
  // todo: move link creation out of function; directly take link as argument
  const machineDrivenLink = root.createElement("a");
  const { name, ...data } = save;
  const formattedSave = SaveJSON.stringify(data);
  const blobData = encodeURIComponent(formattedSave);
  machineDrivenLink.setAttribute(
    "href",
    `data:text/plain;charset=utf-8,${blobData}`,
  );
  machineDrivenLink.setAttribute("download", save.name);
  machineDrivenLink.click();
}

export function deleteSave(storage: Storage, name: string): void {
  const saveKey = slotStorageKey(name === "AUTOSAVE" ? Slot.AUTO : Slot.NAME)(
    name,
  );
  storage.removeItem(saveKey);
  if (name !== "AUTOSAVE") {
    const NAMES_KEY = slotStorageKey(Slot.NAMES)("useless-string");
    const currentNames = storage.getItem(NAMES_KEY);
    const nextNames = new Set(
      currentNames === null ? [] : JSON.parse(currentNames),
    );
    nextNames.delete(name);
    storage.setItem(NAMES_KEY, JSON.stringify([...nextNames]));
  }
}
