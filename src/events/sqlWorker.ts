import { bigIntReplacer } from "../save/save";
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
    worker.addEventListener("message", (event) => console.debug(event));
    const statementId = ++messageId;
    await new Promise<void>((resolve) => {
      function createTables(event: MessageEvent) {
        if (event.data.id === statementId && event.data.ready) {
          worker.removeEventListener("message", createTables);
          const creationId = ++messageId;
          function resolveOnCreation(event: MessageEvent) {
            if (event.data.id === creationId) {
              resolve();
            }
          }
          worker.addEventListener("message", resolveOnCreation);
          postSqlMessage(
            creationId,
            events_table_creation +
              event_sources_table_creation +
              snapshots_table_creation +
              inboxes_table_creation,
          );
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
    console.debug({ sqlMessage: { id, sql, params } });
    worker.postMessage({ id, action: "exec", sql, params });
  }
  return {
    // events
    queryTickEvents(tick: number): Promise<RawEvent[]> {
      const queryId = ++messageId;
      return new Promise((resolve) => {
        function resolveOnQuery(event: MessageEvent) {
          if (event.data.id === queryId) {
            worker.removeEventListener("message", resolveOnQuery);
            resolve(event.data.results[0].values);
          }
        }
        worker.addEventListener("message", resolveOnQuery);
        postSqlMessage(queryId, "SELECT * FROM events WHERE tick = $tick", {
          $tick: tick,
        });
      });
    },
    queryEventDataTickRange(
      start: number,
      end?: number,
    ): Promise<[number, string][]> {
      const queryId = ++messageId;
      return new Promise((resolve) => {
        function resolveOnQuery(event: MessageEvent) {
          if (event.data.id === queryId) {
            worker.removeEventListener("message", resolveOnQuery);
            if (event.data.results.length > 0) {
              resolve(event.data.results[0].values);
            } else {
              resolve([]);
            }
          }
        }
        worker.addEventListener("message", resolveOnQuery);
        postSqlMessage(
          queryId,
          "SELECT tick, data FROM events WHERE (tick >= $start AND ($end IS NULL OR tick < $end)) ORDER BY tick ASC",
          { $start: start, $end: end },
        );
      });
    },
    persistTickTimestampEvent(tick: number, event: BusEvent & TimeStamped) {
      postSqlMessage(
        ++messageId,
        `INSERT INTO ${events_table_name} (name, timestamp, tick, data) VALUES ($name, $timestamp, $tick, $data)`,
        {
          $name: event.tag,
          $timestamp: event.timeStamp,
          $tick: tick,
          $data: JSON.stringify(event, bigIntReplacer),
        },
      );
    },
    persistTimestampEvent(event: BusEvent & TimeStamped) {
      postSqlMessage(
        ++messageId,
        `INSERT INTO ${events_table_name} (name, timestamp, data) VALUES ($name, $timestamp, $data)`,
        {
          $name: event.tag,
          $timestamp: event.timeStamp,
          $data: JSON.stringify(event, bigIntReplacer),
        },
      );
    },
    persistTickEvent(tick: number, event: BusEvent) {
      postSqlMessage(
        ++messageId,
        `INSERT INTO ${events_table_name} (name, tick, data) VALUES ($name, $tick, $data)`,
        {
          $name: event.tag,
          $tick: tick,
          $data: JSON.stringify(event, bigIntReplacer),
        },
      );
    },
    // event sources
    debugEventSources() {
      const queryId = ++messageId;
      function logQueryResult(event: MessageEvent) {
        if (event.data.id === queryId) {
          worker.removeEventListener("message", logQueryResult);
          console.log(event.data.results);
        }
      }
      worker.addEventListener("message", logQueryResult);
      postSqlMessage(queryId, `SELECT * FROM ${event_sources_table_name}`);
    },
    insertEventSource(name: string) {
      postSqlMessage(
        ++messageId,
        `INSERT INTO ${event_sources_table_name} (name) VALUES ($name)`,
        { $name: name },
      );
    },
    // snapshots
    debugSnapshots() {
      const queryId = ++messageId;
      function query(event: MessageEvent) {
        if (event.data.id === queryId) {
          worker.removeEventListener("message", query);
          console.log(event.data.results);
        }
      }
      worker.addEventListener("message", query);
      postSqlMessage(queryId, `SELECT * FROM snapshots`);
    },
    persistSnapshot(tick: number, id: string, data: Processor["data"]) {
      postSqlMessage(
        ++messageId,
        `INSERT INTO ${snapshots_table_name} (source_id, tick, data) VALUES (
        SELECT id FROM ${event_sources_table_name} WHERE name = $name,
        $tick, $data)`,
        {
          $name: id,
          $tick: tick,
          $data: JSON.stringify(data, bigIntReplacer),
        },
      );
    },
    // inboxes
    getTotalInboxSize() {
      const queryId = ++messageId;
      return new Promise<number>((resolve) => {
        function handleQueryResult(event: MessageEvent) {
          if (event.data.id === queryId) {
            worker.removeEventListener("message", handleQueryResult);
            resolve(event.data.results?.[0] ?? 0);
          }
        }
        worker.addEventListener("message", handleQueryResult);
        postSqlMessage(queryId, `SELECT COUNT() FROM ${inboxes_table_name}`);
      });
    },
    getInboxSize(name: string): Promise<number> {
      const queryId = ++messageId;
      return new Promise((resolve) => {
        function handleStatementResult(event: MessageEvent) {
          if (event.data.id === queryId) {
            worker.removeEventListener("message", handleStatementResult);
            resolve(event.data.results?.[0] ?? 0);
          }
        }
        worker.addEventListener("message", handleStatementResult);
        postSqlMessage(
          queryId,
          `SELECT COUNT(*) FROM ${inboxes_table_name} as inbox WHERE inbox.owner_id = (SELECT id FROM ${event_sources_table_name} WHERE name = $inboxOwner)`,
          { $inboxOwner: name },
        );
      });
    },
    deliverToInbox(busEvent: BusEvent, to: string) {
      messageId = messageId + 1;
      const firstQueryId = messageId;
      messageId = messageId + 1;
      const secondQueryId = messageId;
      function handleFirstQuery(event: MessageEvent) {
        if (event.data.id === firstQueryId) {
          worker.removeEventListener("message", handleFirstQuery);
          const results = event.data.results ?? [];
          if (results.length > 0) {
            const [eventId, inboxOwnerId] = results;
            postSqlMessage(
              secondQueryId,
              `INSERT INTO ${inboxes_table_name} (event_id, owner_id) VALUES ($eventId, $ownerId)`,
              { $eventId: eventId, $ownerId: inboxOwnerId },
            );
          } else {
            // fail?
          }
        }
      }
      worker.addEventListener("message", handleFirstQuery);
      postSqlMessage(
        firstQueryId,
        `SELECT event.id FROM ${events_table_name} as event WHERE event.name = $name AND event.tick = $tick AND event.data = $data` +
          `UNION ALL SELECT source.id FROM ${event_sources_table_name} as source WHERE source.name = $owner`,
        {
          $name: busEvent.tag,
          $tick: getTick(busEvent),
          $data: JSON.stringify(busEvent, bigIntReplacer),
          $owner: to,
        },
      );
    },
    consumeInbox(sourceName: string): Promise<string[]> {
      const queryId = ++messageId;
      return new Promise((resolve) => {
        function handleQueryResult(event: MessageEvent) {
          if (event.data.id === queryId) {
            worker.removeEventListener("message", handleQueryResult);
            let results = event.data.results?.[0]?.values ?? [];
            (results as unknown as [number, string][]).sort(
              ([atick], [btick]) => atick - btick,
            );
            for (let i = 0; i < results.length; i++) {
              results[i] = results[i][1];
            }
            resolve(results);
          }
        }
        worker.addEventListener("message", handleQueryResult);
        postSqlMessage(
          queryId,
          `DELETE FROM ${inboxes_table_name} as inbox
            JOIN ${events_table_name} as e
            ON inbox.owner_id = (SELECT id FROM ${event_sources_table_name} WHERE name = $inboxOwner)
              AND inbox.event_id = e.id
          RETURNING tick, data
          ;`,
          { $inboxOwner: sourceName },
        );
      });
    },
  };
}
