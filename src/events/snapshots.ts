import type { SqlWorker } from "./sqlWorker";
import type { Simulation } from "./index";
import type { Processor } from "./processes";

export type SnapshotsAdapter = {
  debugSnapshots(): void;
  persistSnapshot(tick: number, id: string, data: any): void;
  getLastSnapshot(id: string): Promise<any>;
};

export function sqlSnapshotsAdapter(sqlWorker: SqlWorker): SnapshotsAdapter {
  return {
    debugSnapshots() {
      sqlWorker.debugSnapshots();
    },
    persistSnapshot(tick: number, id: string, data: any) {
      sqlWorker.persistSnapshot(tick, id, data);
    },
    getLastSnapshot(id: string): Promise<any> {
      return sqlWorker.getLastSnapshot(id);
    },
  };
}

export function memorySnapshotsAdapter(
  memoryProcessors: Simulation["processors"],
): SnapshotsAdapter {
  return {
    debugSnapshots(): void {
      console.debug("memory snapshots: ", memoryProcessors);
    },
    persistSnapshot(tick: number, id: string, data: any): void {
      const proc = memoryProcessors.get(id as Processor["id"])!;
      // proc.lastTick = tick;
      proc.data = data;
      memoryProcessors.set(id as Processor["id"], proc);
    },
    async getLastSnapshot(id: string): Promise<any> {
      return memoryProcessors.get(id as Processor["id"])!;
    },
  };
}
