import type { Failure, Progress, Success } from "./dialog";
import { derived, writable } from "svelte/store";

export type SaveDialog = { action: "save" } & (
  | { state: "warn-overwrite" }
  | { state: "input-savename" }
  | { state: Progress<"delete">; promise: Promise<any> }
  | { state: Failure<"delete">; error: Error }
  | ({ name: string } & (
      | {
          state: Progress<"write-save">;
          promise: Promise<any>;
        }
      | { state: Failure<"write-save">; error: Error }
      | { state: Success<"write-save"> }
    ))
);
export type State<T> = SaveDialog & { state: T };
export const save_graph = {
  closed: {
    startSave: (overWrite: boolean) =>
      ({
        action: "save",
        state: overWrite ? "warn-overwrite" : "input-savename",
      } as const),
  },
  "warn-overwrite": {
    cancel: () => "closed",
    confirm: (promise: Promise<any>) => ({
      action: "save",
      state: "progress-delete",
      promise,
    }),
  },
  "progress-delete": {
    fail: (error: Error) => ({
      action: "save",
      state: "failure-delete",
      error,
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
    fail: (error: Error, current: State<"progress-write-save">) => ({
      action: "save",
      state: "failure-write-save",
      name: current.name,
      error,
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
    actions: save_graph[dialog === "closed" ? dialog : dialog.state],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | SaveDialog) =>
      current.update((dialog) => action(dialog)),
  };
}
