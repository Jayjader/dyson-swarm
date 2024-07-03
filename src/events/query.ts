import type { BusEvent } from "./events";
import type { SqlWorker } from "./sqlWorker";
import { bigIntRestorer } from "../save/save";

export type EventsQueryAdapter = {
  getTickEvents(tick: number): Promise<BusEvent[]>;
  getTickEventsRange(
    startTick: number,
    endTick?: number,
  ): Promise<Array<[number, BusEvent]>>;
};

export function sqlEventsQueryAdapter(
  sqlWorker: SqlWorker,
): EventsQueryAdapter {
  return {
    async getTickEvents(tick: number) {
      let rawEvents = await sqlWorker.queryTickEvents(tick);
      const busEvents = [];
      for (const rawEvent of rawEvents) {
        busEvents.push(JSON.parse(rawEvent[5] /*event data*/, bigIntRestorer));
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
        busEvents.push([tick, JSON.parse(rawEvent) as unknown as BusEvent] as [
          number,
          BusEvent,
        ]);
      }
      return busEvents;
    },
  };
}
