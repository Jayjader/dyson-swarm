import type { ActionGraph, Failure, Progress, Progression } from "./dialog";
import { derived, writable } from "svelte/store";
import type { LoadDialog } from "./loadDialog";
import { load_graph } from "./loadDialog";

export type ExportDialog = { action: "export" } & {
  state:
    | "input-filename"
    | Progress<"read-save">
    | Failure<"read-save">
    | Progression<"export-save">;
};
export const export_graph: ActionGraph<"export", ExportDialog> = {
  closed: {
    startExport: () => ({ action: "export", state: "input-filename" }),
  },
  "input-filename": {
    cancel: () => "closed",
    confirm: () => ({ action: "export", state: "progress-read-save" }),
  },
  "progress-read-save": {
    fail: () => ({ action: "export", state: "failure-read-save" }),
    success: () => ({ action: "export", state: "progress-export-save" }),
  },
  "failure-read-save": { confirm: () => "closed" },
  "progress-export-save": {
    fail: () => ({ action: "export", state: "failure-export-save" }),
    success: () => ({ action: "export", state: "success-export-save" }),
  },
  "failure-export-save": { confirm: () => "closed" },
  "success-export-save": { confirm: () => "closed" },
};
function makeExportDialogStore() {
  const current = writable<"closed" | ExportDialog>("closed");
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: export_graph[typeof dialog === "string" ? dialog : dialog.state],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | ExportDialog) =>
      current.set(action()),
  };
}
