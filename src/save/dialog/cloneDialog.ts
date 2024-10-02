import type { Failure, Progress, Success } from "./types";
import { derived, writable } from "svelte/store";

export type CloneDialog = { action: "clone" } & (
  | {
      state: Success<"clone">;
    }
  | { state: Progress<"read-save">; promise: Promise<any> }
  | { state: Failure<"read-save">; error: Error }
  | { state: Progress<"write-save">; promise: Promise<any> }
  | { state: Failure<"write-save">; error: Error }
);
export const clone_graph = {
  closed: {
    startClone: (promise: Promise<any>) =>
      ({ action: "clone", state: "progress-read-save", promise }) as const,
  },
  "progress-read-save": {
    fail: (error: Error) =>
      ({ action: "clone", state: "failure-read-save", error }) as const,
    success: (promise: Promise<any>) =>
      ({ action: "clone", state: "progress-write-save", promise }) as const,
  },
  "failure-read-save": { confirm: () => "closed" } as const,
  "progress-write-save": {
    fail: (error: Error) =>
      ({ action: "clone", state: "failure-write-save", error }) as const,
    success: () => ({ action: "clone", state: "success-clone" }) as const,
  },
  "failure-write-save": { confirm: () => "closed" } as const,
  "success-clone": { confirm: () => "closed" } as const,
} as const;

export type StoreState<S extends CloneDialog | "closed"> = S extends CloneDialog
  ? {
      dialog: S;
      actions: (typeof clone_graph)[S["state"]];
    }
  : { dialog: "closed"; actions: (typeof clone_graph)["closed"] };
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
