import { type BusEvent, getTick, type TimeStamped } from "./events";
import type { SqlWorker } from "./sqlWorker";
import type { Id } from "./processes";

export type EventPersistenceAdapter = {
  persistEvent: (event: BusEvent) => Promise<void>;
  deliverEvent: (event: BusEvent, to: string) => Promise<void>;
};
export function sqlEventPersistenceAdapter(
  sqlWorker: SqlWorker,
): EventPersistenceAdapter {
  return {
    persistEvent(event: BusEvent) {
      if (
        "outside-clock-tick" !== event.tag &&
        "simulation-clock-tick" !== event.tag
      ) {
        const tick = getTick(event);
        if ((event as TimeStamped)?.timeStamp !== undefined) {
          if (tick !== undefined) {
            return sqlWorker.persistTickTimestampEvent(
              tick,
              event as BusEvent & TimeStamped,
            );
          } else {
            return sqlWorker.persistTimestampEvent(
              event as BusEvent & TimeStamped,
            );
          }
        } else if (tick !== undefined) {
          return sqlWorker.persistTickEvent(tick, event);
        }
      }
      return Promise.resolve();
    },
    deliverEvent(event: BusEvent, to: string) {
      return sqlWorker.deliverToInbox(event, to);
    },
  };
}

export function memoryEventPersistenceAdapter(
  streamMemory: Map<number, Array<BusEvent>>,
  inboxes: Map<Id, Array<BusEvent>>,
): EventPersistenceAdapter {
  return {
    async deliverEvent(event: BusEvent, to: string) {
      const inbox = inboxes.get(to as Id)!;
      inbox.push(event);
    },
    async persistEvent(event: BusEvent) {
      // todo: cleanup after clock refactor (outside clock ticks might no longer be simulation events)
      if ("outside-clock-tick" === event.tag) {
        return;
      }
      const eventTick = getTick(event);
      if (eventTick !== undefined) {
        const eventsForTick = streamMemory.get(eventTick);
        if (eventsForTick !== undefined) {
          eventsForTick.push(event);
        } else {
          streamMemory.set(eventTick, [event]);
        }
      } else {
        console.warn("no tick found to persist event in memory: ", event);
      }
    },
  };
}
