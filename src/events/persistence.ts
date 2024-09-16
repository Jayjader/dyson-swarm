import { getTick, type BusEvent, type TimeStamped } from "./events";
import type { SqlWorker } from "./sqlWorker";
import type { Simulation } from "./index";
import type { Processor } from "./processes";

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
          sqlWorker.persistTickEvent(tick, event);
        }
      }
    },
    deliverEvent(event: BusEvent, to: string) {
      sqlWorker.deliverToInbox(event, to);
    },
  };
}

export function memoryEventPersistenceAdapter(
  memory: Simulation["processors"],
): EventPersistenceAdapter {
  return {
    deliverEvent(event: BusEvent, to: string): void {
      const processor = memory.get(to as Processor["id"]) as Processor;
      // we know this processor is subscribed to this event because we got its id from the event Tag's registered subscriptions
      // @ts-ignore
      processor.incoming.push(event);
      memory.set(to as Processor["id"], processor);
    },
    persistEvent(event: BusEvent): void {
      // todo: refactor memoryStream to happen here instead
    },
  };
}
