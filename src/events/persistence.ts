import { type BusEvent, getTick, type TimeStamped } from "./events";
import type { SqlWorker } from "./sqlWorker";
import type { Id } from "./processes";
import type { EventStream } from "./processes/eventStream";
import type { MemoryProcessors } from "../adapters";

export type EventPersistenceAdapter = {
  persistEvent: (event: BusEvent) => void;
  deliverEvent: (event: BusEvent, to: string) => void;
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
            sqlWorker.persistTickTimestampEvent(
              tick,
              event as BusEvent & TimeStamped,
            );
          } else {
            sqlWorker.persistTimestampEvent(event as BusEvent & TimeStamped);
          }
        } else {
          if (tick !== undefined) {
            sqlWorker.persistTickEvent(tick, event);
          }
        }
      }
    },
    deliverEvent(event: BusEvent, to: string) {
      sqlWorker.deliverToInbox(event, to);
    },
  };
}

export function memoryEventPersistenceAdapter(
  streamId: EventStream["core"]["id"],
  memory: MemoryProcessors, // todo: remove this ?
  inboxes: Map<Id, Array<BusEvent>>,
): EventPersistenceAdapter {
  return {
    deliverEvent(event: BusEvent, to: string): void {
      const inbox = inboxes.get(to as Id)!;
      inbox.push(event);
    },
    persistEvent(event: BusEvent): void {
      if (
        "outside-clock-tick" !== event.tag &&
        "simulation-clock-tick" !== event.tag
      ) {
        this.deliverEvent(event, streamId);
      }
    },
  };
}
