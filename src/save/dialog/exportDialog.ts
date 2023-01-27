import type { Failure, Progress, Success } from "./dialog";
import { derived, writable } from "svelte/store";

export type ExportDialog = { action: "export" } & (
  | {
      state:
        | "input-filename"
        | Failure<"read-save">
        | Failure<"export-save">
        | Success<"export-save">;
    }
  | { state: Progress<"read-save">; promise: Promise<any> }
  | { state: Progress<"export-save">; promise: Promise<any> }
);
export const export_graph = {
  closed: {
    startExport: () => ({ action: "export", state: "input-filename" } as const),
  },
  "input-filename": {
    cancel: () => "closed",
    confirm: (promise: Promise<any>) => ({
      action: "export",
      state: "progress-read-save",
      promise,
    }),
  },
  "progress-read-save": {
    fail: () => ({ action: "export", state: "failure-read-save" }),
    success: (promise: Promise<any>) => ({
      action: "export",
      state: "progress-export-save",
      promise,
    }),
  },
  "failure-read-save": { confirm: () => "closed" },
  "progress-export-save": {
    fail: () => ({ action: "export", state: "failure-export-save" }),
    success: () => ({ action: "export", state: "success-export-save" }),
  },
  "failure-export-save": { confirm: () => "closed" },
  "success-export-save": { confirm: () => "closed" },
};
export function makeExportDialogStore() {
  const current = writable<"closed" | ExportDialog>(
    export_graph.closed.startExport()
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
