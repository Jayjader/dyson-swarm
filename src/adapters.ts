import { type Simulation } from "./events";
import {
  type EventSourcesAdapter,
  memoryEventSourcesAdapter,
  sqlEventSourcesAdapter,
} from "./events/eventSources";
import {
  memorySnapshotsAdapter,
  type SnapshotsAdapter,
  sqlSnapshotsAdapter,
} from "./events/snapshots";
import {
  type EventsQueryAdapter,
  memoryEventsQueryAdapter,
  sqlEventsQueryAdapter,
} from "./events/query";
import {
  type EventPersistenceAdapter,
  memoryEventPersistenceAdapter,
  sqlEventPersistenceAdapter,
} from "./events/persistence";
import type { SqlWorker } from "./events/sqlWorker";
import type { Id, Processor } from "./events/processes";
import type { BusEvent } from "./events/events";

export type Adapters = {
  events: {
    read: EventsQueryAdapter;
    write: EventPersistenceAdapter;
  };
  eventSources: EventSourcesAdapter;
  snapshots: SnapshotsAdapter;
  setup(sim: Simulation): Simulation;
};

export function initSqlAdapters(sqlWorker: SqlWorker): Adapters {
  return {
    events: {
      read: sqlEventsQueryAdapter(sqlWorker),
      write: sqlEventPersistenceAdapter(sqlWorker),
    },
    eventSources: sqlEventSourcesAdapter(sqlWorker),
    snapshots: sqlSnapshotsAdapter(sqlWorker),
    setup(sim) {
      return sim;
    },
  };
}

export type MemoryProcessors = Map<Id, Processor>;
export function initInMemoryAdapters(): Adapters {
  const memory = new Map() as MemoryProcessors;
  const streamMemory = new Map<number, Array<BusEvent>>();
  const inboxes = new Map<Id, Array<BusEvent>>();
  return {
    events: {
      read: memoryEventsQueryAdapter(streamMemory, inboxes),
      write: memoryEventPersistenceAdapter(streamMemory, inboxes),
    },
    eventSources: memoryEventSourcesAdapter(memory, inboxes),
    snapshots: memorySnapshotsAdapter(memory),
    setup(sim) {
      return sim;
    },
  };
}
