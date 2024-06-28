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

const event_sources_table_creation = `CREATE TABLE IF NOT EXISTS event_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT
);`;

export interface SqlWorker {
  dumpState(): void;
  persistTickTimestampEvent(tick: number, event: BusEvent): void;
  persistTimestampEvent(event: BusEvent): void;
  persistTickEvent(tick: number, event: BusEvent): void;
}

let messageId = 0;
let worker: Worker;
export function createSqlWorker(): SqlWorker {
  if (worker === undefined) {
    worker = new Worker("/worker.sql-wasm.js");
    worker.onerror = (event) => console.error("Worker error: ", event);
    worker.onmessage = (e) => {
      console.debug(e);
      if (e.data.ready) {
        worker.onmessage = (e) => console.debug(e);
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
    };
    worker.postMessage({ id: messageId++, action: "open" });
  }
  return {
    dumpState() {
      worker.postMessage({
        id: messageId++,
        action: "exec",
        sql: "SELECT * FROM events; SELECT name, id FROM event_sources;",
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
