import type { SqlWorker } from "./sqlWorker";
import type { Id, Processor } from "./processes";
import type { MemoryProcessors } from "../adapters";
import { SaveJSON } from "../save/save";

export type SnapshotsAdapter = {
  debugSnapshots(): void;
  persistSnapshot(tick: number, id: Id, data: Processor["data"]): Promise<void>;
  getLastSnapshot(id: Id): Promise<[number, Processor["data"]]>;
  getAllRawSnapshots(): Promise<Array<[Id, number, string]>>;
};

export function sqlSnapshotsAdapter(sqlWorker: SqlWorker): SnapshotsAdapter {
  return {
    debugSnapshots() {
      sqlWorker.debugSnapshots();
    },
    persistSnapshot(tick: number, id: Id, data: Processor["data"]) {
      return sqlWorker.persistSnapshot(tick, id, data);
    },
    async getLastSnapshot(id: string) {
      const [lastTick, rawData] = await sqlWorker.getLastSnapshot(id);
      return [lastTick, SaveJSON.parse(rawData) as Processor["data"]];
    },
    async getAllRawSnapshots() {
      return (await sqlWorker.getAllRawSnapshots()) as unknown as Promise<
        Array<[Id, number, string]>
      >;
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
    async persistSnapshot(tick: number, id: Id, data: Processor["data"]) {
      const proc = memory.get(id)!;
      proc.core.lastTick = tick;
      proc.data = data;
      memory.set(id, proc);
    },
    async getLastSnapshot(id: Id) {
      const proc = memory.get(id)!;
      return [proc.core.lastTick, proc.data];
    },
    async getAllRawSnapshots() {
      return [...memory].map(([procId, proc]) => [
        procId,
        proc.core.lastTick,
        SaveJSON.stringify(proc.data),
      ]);
    },
  };
}
