import { getTick, type BusEvent, type TimeStamped } from "./events";
import type { SqlWorker } from "./sqlWorker";

export type EventPersistenceAdapter = {
  persistEvent: (event: BusEvent) => void;
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
  };
}
