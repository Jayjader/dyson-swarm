import type { Failure, Progress, Success } from "./dialog";
import { derived, writable } from "svelte/store";

export type CloneDialog =
  | { action: "clone" } & (
      | {
          state:
            | Failure<"read-save">
            | Failure<"write-save">
            | Success<"clone">;
        }
      | { state: Progress<"read-save">; promise: Promise<any> }
      | { state: Progress<"write-save">; promise: Promise<any> }
    );
export const clone_graph = {
  closed: {
    startClone: (promise: Promise<any>) =>
      ({ action: "clone", state: "progress-read-save", promise } as const),
  },
  "progress-read-save": {
    fail: () => ({ action: "clone", state: "failure-read-save" } as const),
    success: (promise: Promise<any>) =>
      ({ action: "clone", state: "progress-write-save", promise } as const),
  },
  "failure-read-save": { confirm: () => "closed" } as const,
  "progress-write-save": {
    fail: () => ({ action: "clone", state: "failure-write-save" } as const),
    success: () => ({ action: "clone", state: "success-clone" } as const),
  },
  "failure-write-save": { confirm: () => "closed" } as const,
  "success-clone": { confirm: () => "closed" } as const,
} as const;

export function makeCloneDialogStore() {
  const current = writable<"closed" | CloneDialog>("closed");
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: clone_graph[(dialog as CloneDialog)?.state ?? "closed"],
  }));
  return {
    subscribe: withActions.subscribe,
    act: (action: (...args: any[]) => "closed" | CloneDialog) =>
      current.set(action()),
  };
}
