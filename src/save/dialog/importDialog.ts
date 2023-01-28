import type { Failure, Progress, Success } from "./dialog";
import { derived, writable } from "svelte/store";

export type ImportDialog = { action: "import" } & (
  | {
      state: "warn-overwrite" | "input-file" | Success<"write-save">;
    }
  | { state: Progress<"delete">; promise: Promise<any> }
  | { state: Failure<"delete">; error: Error }
  | { state: Progress<"import-save">; promise: Promise<any> }
  | { state: Failure<"import-save">; error: Error }
  | { state: Progress<"write-save">; promise: Promise<any> }
  | { state: Failure<"write-save">; error: Error }
);
export const import_graph = {
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
    confirm: (promise: Promise<any>) => ({
      action: "import",
      state: "progress-import-save",
      promise,
    }),
  },
  "progress-import-save": {
    fail: (error: Error) => ({
      action: "import",
      state: "failure-import-save",
      error,
    }),
    success: (overWrite: boolean, promise: Promise<any>) =>
      overWrite
        ? { action: "import", state: "progress-delete", promise }
        : { action: "import", state: "progress-write-save", promise },
  },
  "failure-import-save": { confirm: () => "closed" },
  "progress-delete": {
    fail: (error: Error) => ({
      action: "import",
      state: "failure-delete",
      error,
    }),
    success: (promise: Promise<any>) => ({
      action: "import",
      state: "progress-write-save",
      promise,
    }),
  },
  "failure-delete": { confirm: () => "closed" },
  "progress-write-save": {
    fail: (error: Error) => ({
      action: "import",
      state: "failure-write-save",
      error,
    }),
    success: () => ({ action: "import", state: "success-write-save" }),
  },
  "failure-write-save": { confirm: () => "closed" },
  "success-write-save": { confirm: () => "closed" },
};
export function makeImportDialogStore() {
  const current = writable<"closed" | ImportDialog>("closed");
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: import_graph[(dialog as ImportDialog)?.state ?? "closed"],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | ImportDialog) =>
      current.set(action()),
  };
}
