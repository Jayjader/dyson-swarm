import type { SqlWorker } from "./sqlWorker";

export type SnapshotsAdapter = {
  debugSnapshots(): void;
  persistSnapshot(tick: number, id: string, data: any): void;
};

export function sqlSnapshotsAdapter(sqlWorker: SqlWorker): SnapshotsAdapter {
  return {
    debugSnapshots() {
      sqlWorker.debugSnapshots();
    },
    persistSnapshot(tick: number, id: string, data: any) {
      sqlWorker.persistSnapshot(tick, id, data);
    },
  };
}
