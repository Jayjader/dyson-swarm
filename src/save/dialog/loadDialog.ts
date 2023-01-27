import type { Failure, Progress, Success } from "./dialog";
import { derived, writable } from "svelte/store";

export type LoadDialog = { action: "load" } & (
  | {
      state: "warn-discard";
    }
  | ({ name: string } & (
      | {
          state: Progress<"read-save">;
          promise: Promise<any>;
        }
      | { state: Failure<"read-save"> }
      | { state: Success<"read-save"> }
    ))
);

export const load_graph = {
  closed: {
    startLoad: (
      options:
        | { inSimulation: true }
        | { inSimulation: false; promise: Promise<any> }
    ) =>
      options.inSimulation
        ? { action: "load", state: "warn-discard" }
        : {
            action: "load",
            state: "progress-read-save",
            promise: options.promise,
          },
  },
  "warn-discard": {
    cancel: () => "closed",
    confirm: (promise: Promise<any>) => ({
      action: "load",
      state: "progress-read-save",
      promise,
    }),
  },
  "progress-read-save": {
    fail: () => ({ action: "load", state: "failure-read-save" }),
    success: () => ({ action: "load", state: "success-read-save" }),
  },
  "success-read-save": {
    confirm: () => "closed",
  },
  "failure-read-save": {
    confirm: () => "closed",
  },
} as const;

export function makeLoadDialogStore() {
  const current = writable<"closed" | LoadDialog>("closed");
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: load_graph[dialog === "closed" ? "closed" : dialog.state],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | LoadDialog) =>
      current.set(action()),
  };
}
