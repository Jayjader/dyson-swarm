import type { SqlWorker } from "./sqlWorker";
import type { Simulation } from "./index";
import type { Processor } from "./processes";

export type EventSourcesAdapter = {
  insertSource(name: string, value: Processor): void;
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
  };
}

export function memoryEventSourcesAdapter(
  memory: Simulation["processors"],
): EventSourcesAdapter {
  return {
    debugSources() {
      console.debug(memory);
    },
    insertSource(_name: string, proc: Processor): void {
      memory.set(proc.id, proc);
    },
  };
}
