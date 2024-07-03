import { bigIntReplacer } from "../save/save";
import type { BusEvent, TimeStamped } from "./events";

const events_table_creation = `CREATE TABLE IF NOT EXISTS events (
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

const event_sources_table_creation = `CREATE TABLE IF NOT EXISTS event_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT
);`;

export type SqlWorker = ReturnType<typeof createSqlWorker>;
let messageId = 0;
let worker: Worker;
export function createSqlWorker() {
  if (worker === undefined) {
    worker = new Worker("/worker.sql-wasm.js");
    worker.onerror = (event) => console.error("Worker error: ", event);
    worker.addEventListener("message", (event) => console.debug(event));
    function createTables(event: MessageEvent) {
      if (event.data.ready) {
        worker.removeEventListener("message", createTables);
        worker.postMessage({
          id: ++messageId,
          action: "exec",
          sql: events_table_creation,
        });
        worker.postMessage({
          id: ++messageId,
          action: "exec",
          sql: event_sources_table_creation,
        });
      }
    }
    worker.addEventListener("message", createTables);
    worker.postMessage({ id: ++messageId, action: "open" });
  }
  return {
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
        worker.postMessage({
          id: queryId,
          action: "exec",
          sql: "SELECT * FROM events WHERE tick = $tick",
          params: { $tick: tick },
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
        worker.postMessage({
          id: queryId,
          action: "exec",
          sql: "SELECT tick, data FROM events WHERE (tick >= $start AND ($end IS NULL OR tick < $end)) ORDER BY tick ASC",
          params: {
            $start: start,
            $end: end,
          },
        });
      });
    },
    persistTickTimestampEvent(tick: number, event: BusEvent & TimeStamped) {
      worker.postMessage({
        id: ++messageId,
        action: "exec",
        sql: "INSERT INTO events (name, timestamp, tick, data) VALUES ($name, $timestamp, $tick, $data)",
        params: {
          $name: event.tag,
          $timestamp: event.timeStamp,
          $tick: tick,
          $data: JSON.stringify(event, bigIntReplacer),
        },
      });
    },
    persistTimestampEvent(event: BusEvent & TimeStamped) {
      worker.postMessage({
        id: ++messageId,
        action: "exec",
        sql: "INSERT INTO events (name, timestamp, data) VALUES ($name, $timestamp, $data)",
        params: {
          $name: event.tag,
          $timestamp: event.timeStamp,
          $data: JSON.stringify(event, bigIntReplacer),
        },
      });
    },
    persistTickEvent(tick: number, event: BusEvent) {
      worker.postMessage({
        id: ++messageId,
        action: "exec",
        sql: "INSERT INTO events (name, tick, data) VALUES ($name, $tick, $data)",
        params: {
          $name: event.tag,
          $tick: tick,
          $data: JSON.stringify(event, bigIntReplacer),
        },
      });
    },
  };
}
