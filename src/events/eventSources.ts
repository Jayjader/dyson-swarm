import type { SqlWorker } from "./sqlWorker";
import type { Simulation } from "./index";
import type { Id, Processor } from "./processes";
import type { BusEvent } from "./events";

export type EventSourcesAdapter = {
  insertSource(name: string, value: Processor): void;
  getAllSourceIds(): Promise<Array<string>>;
  debugSources(): void;
};

export function sqlEventSourcesAdapter(
  sqlWorker: SqlWorker,
): EventSourcesAdapter {
  return {
    debugSources() {
      sqlWorker.debugEventSources();
    },
    insertSource(name: string) {
      sqlWorker.insertEventSource(name);
    },
    getAllSourceIds(): Promise<Array<string>> {
      return sqlWorker.getAllEventSourceIds();
    },
  };
}

export function memoryEventSourcesAdapter(
  memory: Simulation["processors"],
  inboxes: Map<Id, Array<BusEvent>>,
): EventSourcesAdapter {
  return {
    debugSources() {
      console.debug(memory);
    },
    insertSource(_name: string, proc: Processor): void {
      memory.set(proc.core.id, proc);
      inboxes.set(proc.core.id, []);
    },
    async getAllSourceIds(): Promise<Array<string>> {
      return Array.from(memory.keys());
    },
  };
}
