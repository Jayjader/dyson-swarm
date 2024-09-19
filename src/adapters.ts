import type { Simulation as MemorySimulation } from "./events";
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
import type { Id } from "./events/processes";
import type { BusEvent } from "./events/events";
import type { EventStream } from "./events/processes/eventStream";

export type Adapters = {
  events: {
    read: EventsQueryAdapter;
    write: EventPersistenceAdapter;
  };
  eventSources: EventSourcesAdapter;
  snapshots: SnapshotsAdapter;
};

export function initSqlAdapters(sqlWorker: SqlWorker): Adapters {
  return {
    events: {
      read: sqlEventsQueryAdapter(sqlWorker),
      write: sqlEventPersistenceAdapter(sqlWorker),
    },
    eventSources: sqlEventSourcesAdapter(sqlWorker),
    snapshots: sqlSnapshotsAdapter(sqlWorker),
  };
}

function initInMemoryAdapters(
  memoryProcessors: MemorySimulation["processors"],
): Adapters {
  const streamId: EventStream["core"]["id"] = "stream-0";
  const inboxes = new Map<Id, Array<BusEvent>>();
  return {
    events: {
      read: memoryEventsQueryAdapter(streamId, memoryProcessors, inboxes),
      write: memoryEventPersistenceAdapter(memoryProcessors, inboxes),
    },
    eventSources: memoryEventSourcesAdapter(memoryProcessors, inboxes),
    snapshots: memorySnapshotsAdapter(memoryProcessors),
  };
}
