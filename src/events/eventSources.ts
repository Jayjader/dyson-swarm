import type { SqlWorker } from "./sqlWorker";

export type EventSourcesAdapter = {
  insertSource(name: string): void;
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
