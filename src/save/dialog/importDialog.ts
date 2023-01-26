import type { ActionGraph, Failure, Progress, Progression } from "./dialog";
import { derived, writable } from "svelte/store";

export type ImportDialog = { action: "import" } & {
  state:
    | "warn-overwrite"
    | "input-file"
    | Progress<"delete">
    | Failure<"delete">
    | Progress<"import-save">
    | Failure<"import-save">
    | Progression<"write-save">;
};
export const import_graph: ActionGraph<"import", ImportDialog> = {
  closed: {
    startImport: (overwrite: boolean) =>
      overwrite
        ? { action: "import", state: "warn-overwrite" }
        : { action: "import", state: "input-file" },
  },
  "warn-overwrite": {
    cancel: () => "closed",
    confirm: () => ({ action: "import", state: "input-file" }),
  },
  "input-file": {
    cancel: () => "closed",
    confirm: () => ({ action: "import", state: "progress-import-save" }),
  },
  "progress-import-save": {
    fail: () => ({ action: "import", state: "failure-import-save" }),
    success: (overWrite: boolean) =>
      overWrite
        ? { action: "import", state: "progress-delete" }
        : { action: "import", state: "progress-write-save" },
  },
  "failure-import-save": { confirm: () => "closed" },
  "progress-delete": {
    fail: () => ({ action: "import", state: "failure-delete" }),
    success: () => ({ action: "import", state: "progress-write-save" }),
  },
  "failure-delete": { confirm: () => "closed" },
  "progress-write-save": {
    fail: () => ({ action: "import", state: "failure-write-save" }),
    success: () => ({ action: "import", state: "success-write-save" }),
  },
  "failure-write-save": { confirm: () => "closed" },
  "success-write-save": { confirm: () => "closed" },
};
function makeImportDialogStore() {
  const current = writable<"closed" | ImportDialog>("closed");
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: import_graph[typeof dialog === "string" ? dialog : dialog.state],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | ImportDialog) =>
      current.set(action()),
  };
}
