import type { SqlWorker } from "./sqlWorker";
import { type Id, type Processor, tagFromId } from "./processes";
import type { BusEvent } from "./events";
import type { MemoryProcessors } from "../adapters";

export type EventSourcesAdapter = {
  insertSource(name: Id): Promise<void>;
  getAllSourceIds(): Promise<Array<Id>>;
  debugSources(): void;
};

export function sqlEventSourcesAdapter(
  sqlWorker: SqlWorker,
): EventSourcesAdapter {
  return {
    debugSources() {
      sqlWorker.debugEventSources();
    },
    async insertSource(name: string) {
      await sqlWorker.insertEventSource(name);
    },
    async getAllSourceIds() {
      return (await sqlWorker.getAllEventSourceIds()) as Array<Id>;
    },
  };
}

export function memoryEventSourcesAdapter(
  memory: MemoryProcessors,
  inboxes: Map<Id, Array<BusEvent>>,
): EventSourcesAdapter {
  return {
    debugSources() {
      console.debug(memory);
    },
    async insertSource(name: Id) {
      memory.set(name, {
        core: {
          id: name,
          tag: tagFromId(name),
          lastTick: Number.NEGATIVE_INFINITY,
        },
        data: {},
      } as Processor);
      inboxes.set(name, []);
    },
    async getAllSourceIds() {
      return Array.from(memory.keys());
    },
  };
}
