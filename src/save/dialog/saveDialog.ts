import type { ActionGraph, Failure, Progress, Progression } from "./dialog";
import { derived, writable } from "svelte/store";

export type SaveDialog = { action: "save" } & {
  state:
    | "warn-overwrite"
    | "input-savename"
    | Progress<"delete">
    | Failure<"delete">
    | Progression<"write-save">;
};
export const save_graph: ActionGraph<"save", SaveDialog> = {
  closed: {
    startSave: (overWrite: boolean) =>
      overWrite
        ? { action: "save", state: "warn-overwrite" }
        : { action: "save", state: "input-savename" },
  },
  "warn-overwrite": {
    cancel: () => "closed",
    confirm: () => ({ action: "save", state: "progress-delete" }),
  },
  "progress-delete": {
    fail: () => ({ action: "save", state: "failure-delete" }),
    success: () => ({ action: "save", state: "input-savename" }),
  },
  "failure-delete": {
    confirm: () => "closed",
  },
  "input-savename": {
    cancel: () => "closed",
    confirm: () => ({ action: "save", state: "progress-write-save" }),
  },
  "progress-write-save": {
    fail: () => ({ action: "save", state: "failure-write-save" }),
    success: () => ({ action: "save", state: "success-write-save" }),
  },
  "failure-write-save": {
    confirm: () => "closed",
  },
  "success-write-save": {
    confirm: () => "closed",
  },
};
function makeSaveDialogStore() {
  const current = writable<"closed" | SaveDialog>("closed");
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: save_graph[typeof dialog === "string" ? dialog : dialog.state],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | SaveDialog) =>
      current.set(action()),
  };
}
