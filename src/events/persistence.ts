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
    async persistEvent(event: BusEvent) {
      // todo (clock refactor): remove this condition
      if ("outside-clock-tick" !== event.tag) {
        const tick = getTick(event);
        const timeStamp = (event as TimeStamped)?.timeStamp;
        if (tick !== undefined && timeStamp !== undefined) {
          await sqlWorker.persistTickTimestampEvent(
            tick,
            event as BusEvent & TimeStamped,
          );
        } else if (tick !== undefined) {
          await sqlWorker.persistTickEvent(tick, event);
        } else if (timeStamp !== undefined) {
          await sqlWorker.persistTimestampEvent(
            event as BusEvent & TimeStamped,
          );
        }
      }
    },
    async deliverEvent(event: BusEvent, to: string) {
      await sqlWorker.deliverToInbox(event, to);
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
