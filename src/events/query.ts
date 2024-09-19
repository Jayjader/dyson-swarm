import { type BusEvent, getTick } from "./events";
import type { SqlWorker } from "./sqlWorker";
import { bigIntRestorer } from "../save/save";
import type { Simulation } from "./index";
import type { Id } from "./processes";
import { type EventStream, getEventStream } from "./processes/eventStream";

export type EventsQueryAdapter = {
  getTickEvents(tick: number): Promise<BusEvent[]>;
  getTotalInboxSize(): Promise<number>;
  getInboxSize(sourceId: string): Promise<number>;
  getInbox(sourceId: string): Promise<BusEvent[]>;
  getTickEventsRange(
    startTick: number,
    endTick?: number,
  ): Promise<[number, BusEvent][]>;
};

export function sqlEventsQueryAdapter(
  sqlWorker: SqlWorker,
): EventsQueryAdapter {
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
  streamId: EventStream["core"]["id"],
  memory: Simulation["processors"],
  inboxes: Map<Id, BusEvent[]>,
): EventsQueryAdapter {
  return {
    async getInbox(sourceId: string) {
      return inboxes.get(sourceId as Id)!;
    },
    async getInboxSize(sourceId: string) {
      return inboxes.get(sourceId as Id)!.length;
    },
    async getTickEvents(tick: number) {
      return getEventStream(streamId, memory).data.received.get(tick) ?? [];
    },
    async getTickEventsRange(startTick: number, endTick: number | undefined) {
      const stream = getEventStream(streamId, memory);
      const events: [number, BusEvent][] = [];
      for (
        let i = startTick;
        i <= (endTick ?? Math.max(...stream.data.received.keys()));
        i++
      ) {
        const tickEvents = stream.data.received.get(i);
        if (tickEvents) {
          for (const event of tickEvents) {
            events.push([getTick(event)!, event]);
          }
        }
      }
      return events;
    },
    async getTotalInboxSize() {
      let sum = 0;
      for (let inbox of inboxes.values()) {
        sum += inbox.length;
      }
      return sum;
    },
  };
}
