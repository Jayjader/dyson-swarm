import { type BusEvent, getTick } from "./events";
import type { SqlWorker } from "./sqlWorker";
import { SaveJSON } from "../save/save";
import type { Id } from "./processes";

export type EventsQueryAdapter = {
  getTickEvents(tick: number): Promise<BusEvent[]>;
  getTotalInboxSize(): Promise<number>;
  getInboxSize(sourceId: string): Promise<number>;
  peekInbox(sourceId: string): Promise<BusEvent[]>;
  getInbox(sourceId: string): Promise<BusEvent[]>; // todo: turn this into getFirstInboxAggregate or something (i.e. only get the first event from the inbox, using Time Warp's notion of "event" (all events/messages received for the same tick))
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
        busEvents.push(SaveJSON.parse(rawEvent[5] /*event data*/) as BusEvent);
      }
      return busEvents;
    },
    async getInboxSize(sourceId: string) {
      return sqlWorker.getInboxSize(sourceId);
    },
    async getTotalInboxSize() {
      return sqlWorker.getTotalInboxSize();
    },
    async peekInbox(sourceId: string) {
      const rawEvents = await sqlWorker.peekInbox(sourceId);
      const busEvents: Array<BusEvent> = [];
      for (const rawEvent of rawEvents) {
        busEvents.push(SaveJSON.parse(rawEvent) as BusEvent);
      }
      return busEvents;
    },
    async getInbox(sourceId: string) {
      const rawEvents = await sqlWorker.consumeInbox(sourceId);
      const busEvents: Array<BusEvent> = [];
      for (const rawEvent of rawEvents) {
        busEvents.push(SaveJSON.parse(rawEvent) as BusEvent);
      }
      return busEvents;
    },
    async getTickEventsRange(startTick: number, endTick?: number) {
      const rawEvents = await sqlWorker.queryEventDataTickRange(
        startTick,
        endTick,
      );
      const busEvents: Array<[number, BusEvent]> = [];
      for (const element of rawEvents) {
        const [tick, rawEvent] = element;
        busEvents.push([tick, SaveJSON.parse(rawEvent) as BusEvent]);
      }
      return busEvents;
    },
  };
}

export function memoryEventsQueryAdapter(
  streamMemory: Map<number, Array<BusEvent>>,
  inboxes: Map<Id, BusEvent[]>,
): EventsQueryAdapter {
  return {
    async getInbox(sourceId: string) {
      const inbox = inboxes.get(sourceId as Id);
      if (inbox) {
        return inbox.splice(0);
      } else {
        return [];
      }
    },
    async peekInbox(sourceId: string) {
      const inbox = inboxes.get(sourceId as Id);
      if (inbox) {
        return inbox.slice(0);
      } else {
        return [];
      }
    },
    async getInboxSize(sourceId: string) {
      return inboxes.get(sourceId as Id)!.length;
    },
    async getTickEvents(tick: number) {
      return streamMemory.get(tick) ?? [];
    },
    async getTickEventsRange(startTick: number, endTick: number | undefined) {
      const events: [number, BusEvent][] = [];
      for (
        let i = startTick;
        i <= (endTick ?? Math.max(...streamMemory.keys()));
        i++
      ) {
        const tickEvents = streamMemory.get(i);
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
