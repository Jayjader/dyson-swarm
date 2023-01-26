import type { Progression } from "./dialog";
import { derived, writable } from "svelte/store";

export type LoadDialog = { action: "load" } & {
  state: "warn-discard" | Progression<"read-save"> | Progression<"load-save">;
};
export const load_graph = {
  closed: {
    startLoad: (inSimulation: boolean) =>
      inSimulation
        ? { action: "load", state: "warn-discard" }
        : { action: "load", state: "progress-read-save" },
  },
  "warn-discard": {
    cancel: () => "closed",
    confirm: () => ({ action: "load", state: "progress-read-save" }),
  },
  "progress-read-save": {
    fail: () => ({ action: "load", state: "failure-read-save" }),
    success: () => ({ action: "load", state: "success-read-save" }),
  },
  "failure-read-save": {
    confirm: () => "closed",
  },
  "success-read-save": {
    confirm: () => ({ action: "load", state: "progress-load-save" }),
  },
  "progress-load-save": {
    fail: () => ({ action: "load", state: "failure-load-save" }),
    success: () => ({ action: "load", state: "success-load-save" }),
  },
  "failure-load-save": {
    confirm: () => "closed",
  },
  "success-load-save": {
    confirm: () => "closed",
  },
};

function makeLoadDialogStore() {
  const current = writable<"closed" | LoadDialog>("closed");
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: load_graph[typeof dialog === "string" ? dialog : dialog.state],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | LoadDialog) =>
      current.set(action()),
  };
}
