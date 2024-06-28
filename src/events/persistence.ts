import type { BusEvent } from "./events";
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
        const tick =
          (event as any)?.beforeTick ??
          (event as any)?.afterTick ??
          (event as any)?.onTick ??
          (event as any)?.receivedTick;
        if ((event as any)?.timeStamp !== undefined) {
          if (tick !== undefined) {
            sqlWorker.persistTickTimestampEvent(tick, event);
          } else {
            sqlWorker.persistTimestampEvent(event);
          }
        } else {
          sqlWorker.persistTickEvent(tick, event);
        }
      }
    },
  };
}
