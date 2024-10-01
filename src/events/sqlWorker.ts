import { SaveJSON } from "../save/save";
import { type BusEvent, getTick, type TimeStamped } from "./events";
import type { Processor } from "./processes";

const events_table_name = "events";
const events_table_creation = `DROP TABLE IF EXISTS ${events_table_name};
CREATE TABLE ${events_table_name} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER,
  tick INTEGER,
  name TEXT,
  source_id INTEGER,
  data TEXT
);`;

export type RawEvent = [
  number /*id*/,
  number | null /*timestamp*/,
  number | null /*tick*/,
  BusEvent["tag"] /*name*/,
  number /*source_id*/,
  string /*data*/,
];

const event_sources_table_name = "event_sources";
const event_sources_table_creation = `DROP TABLE IF EXISTS ${event_sources_table_name};
CREATE TABLE ${event_sources_table_name} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT
);`;
const snapshots_table_name = "snapshots";
const snapshots_table_creation = `DROP TABLE IF EXISTS ${snapshots_table_name};
CREATE TABLE ${snapshots_table_name} (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 source_id INTEGER NOT NULL,
 tick INTEGER NOT NULL,
 data TEXT NOT NULL
 );`;
export type RawSnapshot = [
  number /*id*/,
  number /*source_id*/,
  number /*tick*/,
  string /*data*/,
];
const inboxes_table_name = "inboxes";
const inboxes_table_creation = `DROP TABLE IF EXISTS ${inboxes_table_name};
CREATE TABLE ${inboxes_table_name} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL
);`;
// todo: different tables for different simulation savefiles
// todo: handle generations

export type SqlWorker =
  ReturnType<typeof getOrCreateSqlWorker> extends Promise<infer U> ? U : never;
let messageId = 0;
let worker: Worker;
export async function getOrCreateSqlWorker() {
  if (worker === undefined) {
    worker = new Worker("/worker.sql-wasm.js");
    worker.onerror = (event) => console.error("Worker error: ", event);
    worker.addEventListener(
      "message",
      (event) => event.data.id || console.debug(event),
    );
    const statementId = ++messageId;
    await new Promise<void>((resolve) => {
      async function createTables(event: MessageEvent) {
        if (event.data.id === statementId && event.data.ready) {
          worker.removeEventListener("message", createTables);
          const creationId = ++messageId;
          await postSqlMessage(
            creationId,
            events_table_creation +
              event_sources_table_creation +
              snapshots_table_creation +
              inboxes_table_creation,
          );
          resolve();
        }
      }
      worker.addEventListener("message", createTables);
      worker.postMessage({ id: statementId, action: "open" });
    });
  }
  function postSqlMessage(
    id: number,
    sql: string,
    params?: Record<string, any>,
  ) {
    return new Promise<Array<unknown>>((resolve, reject) => {
      function handleMessageResponse(event: MessageEvent) {
        if (event.data.id === id) {
          worker.removeEventListener("message", handleMessageResponse);
          console.debug(event.data);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve((event.data?.results as undefined | Array<unknown>) ?? []);
          }
        }
      }
      worker.addEventListener("message", handleMessageResponse);
      console.debug({ sqlMessage: { id, sql, params } });
      worker.postMessage({ id, action: "exec", sql, params });
    });
  }
  return {
    close() {
      messageId = messageId + 1;
      const queryId = messageId;
      worker.postMessage({ id: queryId, action: "close" });
    },
    // events
    async queryTickEvents(tick: number): Promise<RawEvent[]> {
      const queryId = ++messageId;
      const results = await postSqlMessage(
        queryId,
        "SELECT * FROM events WHERE tick = $tick",
        { $tick: tick },
      );
      return (results as [{ values: RawEvent[] }])[0].values;
    },
    async queryEventDataTickRange(
      start: number,
      end?: number,
    ): Promise<[number, string][]> {
      const queryId = ++messageId;
      const [result] = await postSqlMessage(
        queryId,
        "SELECT tick, data FROM events WHERE (tick >= $start AND ($end IS NULL OR tick < $end)) ORDER BY tick ASC",
        { $start: start, $end: end },
      );
      if (result !== undefined) {
        return (result as { values: Array<[number, string]> }).values;
      } else {
        return [];
      }
    },
    persistTickTimestampEvent(tick: number, event: BusEvent & TimeStamped) {
      messageId = messageId + 1;
      const queryId = messageId;
      return postSqlMessage(
        queryId,
        `INSERT INTO ${events_table_name} (name, timestamp, tick, data) VALUES ($name, $timestamp, $tick, $data)`,
        {
          $name: event.tag,
          $timestamp: event.timeStamp,
          $tick: tick,
          $data: SaveJSON.stringify(event),
        },
      );
    },
    persistTimestampEvent(event: BusEvent & TimeStamped) {
      messageId = ++messageId;
      const queryId = ++messageId;
      return postSqlMessage(
        queryId,
        `INSERT INTO ${events_table_name} (name, timestamp, data) VALUES ($name, $timestamp, $data)`,
        {
          $name: event.tag,
          $timestamp: event.timeStamp,
          $data: SaveJSON.stringify(event),
        },
      );
    },
    persistTickEvent(tick: number, event: BusEvent) {
      messageId = messageId + 1;
      const queryId = messageId;
      return postSqlMessage(
        queryId,
        `INSERT INTO ${events_table_name} (name, tick, data) VALUES ($name, $tick, $data)`,
        {
          $name: event.tag,
          $tick: tick,
          $data: SaveJSON.stringify(event),
        },
      );
    },
    // event sources
    async debugEventSources() {
      messageId = messageId + 1;
      const queryId = messageId;
      const results = await postSqlMessage(
        queryId,
        `SELECT * FROM ${event_sources_table_name}`,
      );
      console.log(results);
    },
    insertEventSource(name: string) {
      messageId = messageId + 1;
      const queryId = messageId;
      return postSqlMessage(
        queryId,
        `INSERT INTO ${event_sources_table_name} (name) VALUES ($name)`,
        { $name: name },
      );
    },
    async getAllEventSourceIds(): Promise<string[]> {
      messageId = messageId + 1;
      const queryId = messageId;
      const [result] = await postSqlMessage(
        queryId,
        `SELECT name FROM ${event_sources_table_name}`,
      );
      if (result !== undefined) {
        return (result as { values: string[] }).values ?? [];
      }
      return [];
    },
    // snapshots
    async debugSnapshots() {
      messageId = messageId + 1;
      const queryId = messageId;
      const results = await postSqlMessage(
        queryId,
        `SELECT * FROM ${snapshots_table_name}`,
      );
      console.log(results);
    },
    persistSnapshot(tick: number, id: string, data: Processor["data"]) {
      messageId = messageId + 1;
      const queryId = messageId;
      return postSqlMessage(
        queryId,
        `INSERT INTO ${snapshots_table_name} (source_id, tick, data) VALUES (
        (SELECT id FROM ${event_sources_table_name} WHERE name = $name),
        $tick, $data)`,
        {
          $name: id,
          $tick: tick,
          $data: SaveJSON.stringify(data),
        },
      );
    },
    async getLastSnapshot(id: string): Promise<[number, string]> {
      messageId = messageId + 1;
      const queryId = messageId;
      const [result] = await postSqlMessage(
        queryId,
        `SELECT tick, data
            FROM ${snapshots_table_name}
            WHERE source_id = (SELECT id FROM ${event_sources_table_name} WHERE name = $sourceName)
          ORDER BY tick DESC LIMIT 1`,
        { $sourceName: id },
      );
      if (result !== undefined) {
        return (result as { values: Array<[number, string]> }).values[0];
      } else {
        throw new Error(`couldn't parse snapshot from db: ${result}`);
      }
    },
    async getAllRawSnapshots(): Promise<Array<[string, number, string]>> {
      messageId = messageId + 1;
      const queryId = messageId;
      const results = await postSqlMessage(
        queryId,
        `SELECT sources.name, snapshots.tick, snapshots.data FROM ${snapshots_table_name} as snapshots
            JOIN ${event_sources_table_name} as sources
            ON snapshots.source_id = sources.id
          ORDER BY snapshots.tick ASC`,
      );
      return (
        (results?.[0] as { values: Array<[string, number, string]> }).values ??
        []
      );
    },
    // inboxes
    async getTotalInboxSize() {
      messageId = messageId + 1;
      const queryId = messageId;

      return (
        (
          (await postSqlMessage(
            queryId,
            `SELECT COUNT() FROM ${inboxes_table_name}`,
          )) as Array<[number]>
        )?.[0]?.[0] ?? 0
      );
    },
    async getInboxSize(name: string): Promise<number> {
      messageId = messageId + 1;
      const queryId = messageId;
      return (
        (
          (await postSqlMessage(
            queryId,
            `SELECT COUNT(*) FROM ${inboxes_table_name} as inbox WHERE inbox.owner_id = (SELECT id FROM ${event_sources_table_name} WHERE name = $inboxOwner)`,
            { $inboxOwner: name },
          )) as Array<[number]>
        )?.[0]?.[0] ?? 0
      );
    },
    async deliverToInbox(busEvent: BusEvent, to: string) {
      messageId = messageId + 1;
      const firstQueryId = messageId;
      messageId = messageId + 1;
      const secondQueryId = messageId;
      const [eventId, inboxOwnerId] = await postSqlMessage(
        firstQueryId,
        `SELECT event.id FROM ${events_table_name} as event WHERE event.name = $name AND event.tick = $tick AND event.data = $data` +
          `UNION ALL SELECT source.id FROM ${event_sources_table_name} as source WHERE source.name = $owner`,
        {
          $name: busEvent.tag,
          $tick: getTick(busEvent),
          $data: SaveJSON.stringify(busEvent),
          $owner: to,
        },
      );
      return postSqlMessage(
        secondQueryId,
        `INSERT INTO ${inboxes_table_name} (event_id, owner_id) VALUES ($eventId, $ownerId)`,
        { $eventId: eventId, $ownerId: inboxOwnerId },
      );
    },
    async peekInbox(sourceName: string): Promise<string[]> {
      messageId = messageId + 1;
      const queryId = messageId;
      const [{ values }] = (await postSqlMessage(
        queryId,
        `SELECT events.tick, events.data FROM ${events_table_name} as events
        JOIN ${inboxes_table_name} as inboxes
        ON inboxes.owner_id = (SELECT id FROM ${event_sources_table_name} WHERE name = $inboxOwner)
        AND inboxes.event_id = events.id`,
        { $inboxOwner: sourceName },
      )) as Array<{ values: Array<[number, string]> }>;
      values.sort(([aTick], [bTick]) => aTick - bTick);
      return values.map(([_tick, data]) => data) ?? [];
    },
    async consumeInbox(sourceName: string): Promise<string[]> {
      messageId = messageId + 1;
      const queryId = messageId;
      const [{ values }] = (await postSqlMessage(
        queryId,
        `DELETE FROM ${inboxes_table_name} as inbox
            JOIN ${events_table_name} as e
            ON inbox.owner_id = (SELECT id FROM ${event_sources_table_name} WHERE name = $inboxOwner)
              AND inbox.event_id = e.id
          RETURNING tick, data
          ;`,
        { $inboxOwner: sourceName },
      )) as Array<{ values: Array<[number, string]> }>;
      values.sort(([aTick], [bTick]) => aTick - bTick);
      return values.map(([_tick, data]) => data) ?? [];
    },
  };
}
