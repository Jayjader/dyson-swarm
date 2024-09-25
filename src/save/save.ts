import type { Id, Processor } from "../events/processes";
import { SUBSCRIPTIONS } from "../events/subscriptions";
import type { BusEvent, EventTag } from "../events/events";
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
import {
  createFabricator,
  type Fabricator,
} from "../events/processes/fabricator";
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

export async function loadSave(
  save: SaveState,
  adapters: Adapters,
): Promise<Simulation> {
  if (save.version === "adapters-rewrite") {
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
        data;
      for (const snapshot of save.snapshots) {
        if (snapshot.id === id) {
          if (snapshot.tick > lastTick) {
            lastTick = snapshot.tick;
            try {
              data = JSON.parse(
                snapshot.data,
                bigIntRestorer,
              ) as Processor["data"];
            } catch (e) {
              console.error(`json error for snapshot of ${id}/${tag}: `, e);
            }
          }
        }
      }
      if (lastTick === Number.NEGATIVE_INFINITY || data === undefined) {
        continue;
      }
      adapters.eventSources.insertSource(id, {
        core: { id, tag, lastTick },
        data,
      } as Processor);
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
  } else {
    // todo: try to convert to the most current version
    return { bus: { subscriptions: new Map() } };
  }
}

export async function generateSave(
  sim: Simulation,
  adapters: Adapters,
): Promise<SaveState> {
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
  /*
  const processors = [];
  let stream!: SerializedStream;
  for (const proc of sim.processors.values()) {
    if (proc.core.tag !== "stream") {
      processors.push(proc as Exclude<Processor, EventStream>);
      continue;
    }
    stream = {
      data: {
        unfinishedTick: (proc as EventStream).data.unfinishedTick,
        received: [...(proc as EventStream).data.received],
      },
      core: {
        tag: proc.core.tag,
        id: proc.core.id,
        lastTick: proc.core.lastTick,
      },
      // incoming: proc.incoming, // todo: use events adapter's .peekInbox()
    };
  }
  console.debug({ saveStream: stream });
   */
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

export function readSave(name: string, storage: Storage): null | SaveState {
  const data = storage.getItem(slotStorageKey(Slot.NAME)(name));
  return data === null ? null : parseProcessors(data);
}

/**
 * Reverses effects of `JSON.stringify` serializing `Infinity` as `null`.
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
          count: order.count ?? Infinity,
        },
  );
}
const BIG_INT_PROPERTY_KEYS = ["charge", "flux", "amount", "stored", "mass"];
export function bigIntRestorer(key: string, value: any) {
  return BIG_INT_PROPERTY_KEYS.includes(key) ? BigInt(value) : value;
}
export function bigIntReplacer(key: string, value: any) {
  if (key.startsWith("probe")) {
    return undefined;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
export function parseProcessors(formatted: string): SaveState {
  const parsed = JSON.parse(formatted, bigIntRestorer) as SaveState;
  parsed.stream.incoming = parsed.stream.incoming.map((e) =>
    e.tag === "command-set-fabricator-queue" || e.tag === "fabricator-queue-set"
      ? { ...e, queue: convertNullBuildOrderCountsToInfinity(e.queue) }
      : e,
  );
  console.log({ parsedStream: parsed.stream });
  for (const [index, [_tick, events]] of parsed.stream.data.received.map(
    (value, index) => [index, value] as const,
  )) {
    parsed.stream.data.received[index][1] = events.map((e) =>
      e.tag === "command-set-fabricator-queue" ||
      e.tag === "fabricator-queue-set"
        ? { ...e, queue: convertNullBuildOrderCountsToInfinity(e.queue) }
        : e,
    );
  }
  const fabricatorIndex = parsed.processors.findIndex(
    (p) => p.core.tag === "fabricator",
  );
  parsed.processors[fabricatorIndex].incoming = parsed.processors[
    fabricatorIndex
  ].incoming.map((e) =>
    e.tag === "command-set-fabricator-queue" || e.tag === "fabricator-queue-set"
      ? { ...e, queue: convertNullBuildOrderCountsToInfinity(e.queue) }
      : e,
  );
  (parsed.processors[fabricatorIndex] as Fabricator).data.queue =
    convertNullBuildOrderCountsToInfinity(
      (parsed.processors[fabricatorIndex] as Fabricator).data.queue,
    );
  return parsed;
}

export function formatProcessors(procs: SaveState): string {
  return JSON.stringify(procs, bigIntReplacer);
}

function stripNonCommandsInTicksOlderThan(
  ticksIntoThePast: number,
  stream: SerializedStream,
): SerializedStream {
  return {
    ...stream,
    data: {
      ...stream.data,
      received: stream.data.received
        .map(
          ([tick, events]) =>
            [
              tick,
              tick >= stream.data.unfinishedTick - ticksIntoThePast
                ? events
                : events.filter((e) => e.tag.startsWith("command")),
            ] as SerializedStream["data"]["received"][number],
        )
        .filter(([_tick, events]) => events.length > 0),
    },
  };
}
export function writeSlotToStorage(save: Save, storage: Storage) {
  const longEnoughToRebuildState = 5 * 60; // grab at least the last 5 seconds of all events (if at max clock speed)
  const formattedSave = formatProcessors({
    stream: stripNonCommandsInTicksOlderThan(
      longEnoughToRebuildState,
      save.stream,
    ),
    processors: save.processors,
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
      const stream = stripNonCommandsInTicksOlderThan(
        hopefullyEnoughToDebugAnyErrors,
        save.stream,
      );
      const formattedSave = formatProcessors({
        stream,
        processors: save.processors,
      });
      storage.setItem(saveKey, formattedSave);
    } catch (e) {
      // still too big for non-commands, but maybe we can still fit in *just* the commands
      const stream = stripNonCommandsInTicksOlderThan(0, save.stream);
      const formattedSave = formatProcessors({
        stream,
        processors: save.processors,
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
  const formattedSave = formatProcessors({
    stream: save.stream,
    processors: save.processors,
  });
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
