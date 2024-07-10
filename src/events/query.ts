import type { BusEvent } from "./events";
import type { SqlWorker } from "./sqlWorker";
import { bigIntRestorer } from "../save/save";

export type EventsQueryAdapter = ReturnType<typeof sqlEventsQueryAdapter>;

export function sqlEventsQueryAdapter(sqlWorker: SqlWorker) {
  return {
    async getTickEvents(tick: number) {
      let rawEvents = await sqlWorker.queryTickEvents(tick);
      const busEvents: BusEvent[] = [];
      for (const rawEvent of rawEvents) {
        busEvents.push(JSON.parse(rawEvent[5] /*event data*/, bigIntRestorer));
      }
      return busEvents;
    },
    async getInboxSize(sourceId: string) {
      return sqlWorker.getInboxSize(sourceId);
    },
    async getTotalInboxSize() {
      return sqlWorker.getTotalInboxSize();
    },
    async getInbox(sourceId: string) {
      let rawEvents = await sqlWorker.consumeInbox(sourceId);
      const busEvents: Array<BusEvent> = [];
      for (const rawEvent of rawEvents) {
        busEvents.push(JSON.parse(rawEvent, bigIntRestorer));
      }
      return busEvents;
    },
    async getTickEventsRange(startTick: number, endTick?: number) {
      let rawEvents = await sqlWorker.queryEventDataTickRange(
        startTick,
        endTick,
      );
      const busEvents = [];
      for (const element of rawEvents) {
        const [tick, rawEvent] = element;
        busEvents.push([
          tick,
          JSON.parse(rawEvent, bigIntRestorer) as unknown as BusEvent,
        ] as [number, BusEvent]);
      }
      return busEvents;
    },
  };
}
