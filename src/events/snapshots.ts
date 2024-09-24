import type { SqlWorker } from "./sqlWorker";
import type { Processor } from "./processes";
import type { MemoryProcessors } from "../adapters";

export type SnapshotsAdapter = {
  debugSnapshots(): void;
  persistSnapshot(tick: number, id: string, data: any): void;
  getLastSnapshot(id: string): Promise<[number, Processor["data"]]>;
  getAllRawSnapshots(): Promise<Array<[string, number, string]>>;
};

export function sqlSnapshotsAdapter(sqlWorker: SqlWorker): SnapshotsAdapter {
  return {
    debugSnapshots() {
      sqlWorker.debugSnapshots();
    },
    persistSnapshot(tick: number, id: string, data: any) {
      sqlWorker.persistSnapshot(tick, id, data);
    },
    async getLastSnapshot(id: string) {
      const [lastTick, rawData] = await sqlWorker.getLastSnapshot(id);
      return [lastTick, JSON.parse(rawData) as Processor["data"]];
    },
    async getAllRawSnapshots() {
      return sqlWorker.getAllRawSnapshots();
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
    async getLastSnapshot(id: string) {
      const proc = memory.get(id as Processor["core"]["id"])!;
      return [proc.core.lastTick, proc.data];
    },
  };
}
