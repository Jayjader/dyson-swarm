import type { Failure, Progress, Success } from "./types";
import { derived, writable } from "svelte/store";
import type { SaveState } from "../save";

export type ExportDialog = { action: "export" } & (
  | {
      state: "input-filename" | Success<"export-save">;
    }
  | { state: Progress<"read-save">; promise: Promise<SaveState> }
  | { state: Failure<"read-save">; error: Error }
  | { state: Progress<"export-save">; promise: Promise<void> }
  | { state: Failure<"export-save">; error: Error }
);
export const export_graph = {
  closed: {
    startExport: () => ({ action: "export", state: "input-filename" }) as const,
  },
  "input-filename": {
    cancel: () => "closed",
    confirm: (promise: Promise<SaveState>) => ({
      action: "export",
      state: "progress-read-save",
      promise,
    }),
  },
  "progress-read-save": {
    fail: (error: Error) => ({
      action: "export",
      state: "failure-read-save",
      error,
    }),
    success: (promise: Promise<void>) => ({
      action: "export",
      state: "progress-export-save",
      promise,
    }),
  },
  "failure-read-save": { confirm: () => "closed" },
  "progress-export-save": {
    fail: (error: Error) => ({
      action: "export",
      state: "failure-export-save",
      error,
    }),
    success: () => ({ action: "export", state: "success-export-save" }),
  },
  "failure-export-save": { confirm: () => "closed" },
  "success-export-save": { confirm: () => "closed" },
};
export function makeExportDialogStore() {
  const current = writable<"closed" | ExportDialog>(
    export_graph.closed.startExport(),
  );
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: export_graph[(dialog as ExportDialog)?.state ?? "closed"],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | ExportDialog) =>
      current.set(action()),
  };
}
