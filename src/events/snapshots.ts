import type { SqlWorker } from "./sqlWorker";
import type { Processor } from "./processes";
import type { MemoryProcessors } from "../adapters";

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
  memory: MemoryProcessors,
): SnapshotsAdapter {
  return {
    debugSnapshots(): void {
      console.debug("memory snapshots: ", memory);
    },
    persistSnapshot(tick: number, id: string, data: any): void {
      const proc = memory.get(id as Processor["core"]["id"])!;
      proc.core.lastTick = tick;
      proc.data = data;
      memory.set(id as Processor["core"]["id"], proc);
    },
    async getLastSnapshot(id: string): Promise<any> {
      return memory.get(id as Processor["core"]["id"])!;
    },
  };
}
