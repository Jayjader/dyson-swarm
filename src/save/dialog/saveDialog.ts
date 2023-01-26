import type { ActionGraph, Failure, Progress, Success } from "./dialog";
import { derived, writable } from "svelte/store";
import type { DeleteDialog } from "./deleteDialog";

export type SaveDialog = { action: "save" } & (
  | ({ overWrittenName: string } & (
      | { state: "warn-overwrite" }
      | { state: Progress<"delete">; promise: Promise<any> }
      | { state: Failure<"delete"> }
    ))
  | { state: "input-savename" }
  | ({ name: string } & (
      | {
          state: Progress<"write-save">;
          promise: Promise<any>;
        }
      | { state: Failure<"write-save"> }
      | { state: Success<"write-save"> }
    ))
);
export type State<T> = SaveDialog & { state: T };
export const save_graph: ActionGraph<"save", SaveDialog> = {
  closed: {
    startSave: (overWrittenName: string) =>
      overWrittenName
        ? { action: "save", state: "warn-overwrite", overWrittenName }
        : { action: "save", state: "input-savename" },
  },
  "warn-overwrite": {
    cancel: () => "closed",
    confirm: (promise: Promise<void>, current: State<"warn-overwrite">) => ({
      action: "save",
      state: "progress-delete",
      promise,
      overWrittenName: current.overWrittenName,
    }),
  },
  "progress-delete": {
    fail: (current: State<"warn-overwrite">) => ({
      action: "save",
      state: "failure-delete",
      overWrittenName: current.overWrittenName,
    }),
    success: () => ({
      action: "save",
      state: "input-savename",
    }),
  },
  "failure-delete": {
    confirm: () => "closed",
  },
  "input-savename": {
    cancel: () => "closed",
    confirm: (name: string, promise: Promise<any>) => ({
      action: "save",
      state: "progress-write-save",
      name,
      promise,
    }),
  },
  "progress-write-save": {
    fail: (current: State<"progress-write-save">) => ({
      action: "save",
      state: "failure-write-save",
      name: current.name,
    }),
    success: (current: State<"progress-write-save">) => ({
      action: "save",
      state: "success-write-save",
      name: current.name,
    }),
  },
  "failure-write-save": {
    confirm: () => "closed",
  },
  "success-write-save": {
    confirm: () => "closed",
  },
};
export function makeSaveDialogStore(overWrite: boolean) {
  const current = writable<"closed" | SaveDialog>(
    save_graph.closed.startSave(overWrite)
  );
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: dialog === "closed" ? undefined : save_graph[dialog.state],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | SaveDialog) =>
      current.update((dialog) => action(dialog)),
  };
}
