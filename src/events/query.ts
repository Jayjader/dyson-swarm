import type { BusEvent } from "./events";
import type { SqlWorker } from "./sqlWorker";
import { bigIntRestorer } from "../save/save";
import type { Simulation } from "./index";
import type { Id } from "./processes";

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
      const busEvents: Array<[number, BusEvent]> = [];
      for (const element of rawEvents) {
        const [tick, rawEvent] = element;
        busEvents.push([tick, JSON.parse(rawEvent, bigIntRestorer)]);
      }
      return busEvents;
    },
  };
}

export function memoryEventsQueryAdapter(
  memory: Simulation["processors"],
  inboxes: Map<Id, BusEvent[]>,
): EventsQueryAdapter {
  return {
    async getInbox(sourceId: string): Promise<Array<BusEvent>> {
      return inboxes.get(sourceId as Id)!;
    },
    async getInboxSize(sourceId: string): Promise<number> {
      return inboxes.get(sourceId as Id)!.length;
    },
    async getTickEvents(tick: number): Promise<BusEvent[]> {
      return undefined; // todo rely on event stream
    },
    async getTickEventsRange(
      startTick: number,
      endTick: number | undefined,
    ): Promise<Array<[number, BusEvent]>> {
      return undefined; // todo rely on event stream
    },
    async getTotalInboxSize(): Promise<number> {
      let sum = 0;
      for (let inbox of inboxes.values()) {
        sum += inbox.length;
      }
      return sum;
    },
  };
}
