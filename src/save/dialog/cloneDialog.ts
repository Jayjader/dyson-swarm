import type { Failure, Progress, Success } from "./dialog";
import { derived, writable } from "svelte/store";

export type CloneDialog = { action: "clone" } & {
  state:
    | Progress<"read-save">
    | Failure<"read-save">
    | Progress<"write-save">
    | Failure<"write-save">
    | Success<"clone">;
};
export const clone_graph = {
  closed: {
    startClone: () =>
      ({ action: "clone", state: "progress-read-save" } as const),
  },
  "progress-read-save": {
    fail: () => ({ action: "clone", state: "failure-read-save" } as const),
    success: () => ({ action: "clone", state: "progress-write-save" } as const),
  },
  "failure-read-save": { confirm: () => "closed" } as const,
  "progress-write-save": {
    fail: () => ({ action: "clone", state: "failure-write-save" } as const),
    success: () => ({ action: "clone", state: "success-clone" } as const),
  },
  "failure-write-save": { confirm: () => "closed" } as const,
  "success-clone": { confirm: () => "closed" } as const,
} as const;

function makeCloneDialogStore() {
  const current = writable<"closed" | CloneDialog>("closed");
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: clone_graph[typeof dialog === "string" ? dialog : dialog.state],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | CloneDialog) =>
      current.set(action()),
  };
}
