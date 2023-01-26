import type { Failure, Progress, Success } from "./dialog";
import { derived, type Readable, writable } from "svelte/store";

export type DeleteDialog = { action: "delete"; name: string } & (
  | { state: "warn-discard" }
  | { state: Progress<"delete">; promise: Promise<any> }
  | {
      state: Failure<"delete">;
      error: Error;
    }
  | { state: Success<"delete"> }
);

export type State<T> = DeleteDialog & { state: T };
export const delete_graph = {
  closed: {
    startDelete: (name: string) =>
      ({
        action: "delete",
        state: "warn-discard",
        name,
      } as const),
  },
  "warn-discard": {
    cancel: () => "closed",
    confirm: (promise: Promise<void>, current: State<"warn-discard">) => ({
      action: "delete",
      state: "progress-delete",
      name: current.name,
      promise,
    }),
  },
  "progress-delete": {
    fail: (error: Error, current: State<"progress-delete">) => ({
      action: "delete",
      state: "failure-delete",
      name: current.name,
      error,
    }),
    success: (current: State<"progress-delete">) => ({
      action: "delete",
      state: "success-delete",
      name: current.name,
    }),
  },
  "failure-delete": {
    confirm: () => "closed",
  },
  "success-delete": {
    confirm: () => "closed",
  },
} as const;

type StoreValue<Store> = Store extends Readable<infer V> ? V : never;
export function makeDeleteDialogStore(saveName: string) {
  const current = writable<DeleteDialog>(
    delete_graph.closed.startDelete(saveName)
  );
  const withActions = derived(current, (dialog) => ({
    dialog,
    actions: delete_graph[dialog.state],
  }));
  return {
    tag: "delete",
    subscribe: withActions.subscribe,
    act: (action: (currentState: StoreValue<typeof current>) => DeleteDialog) =>
      current.update((dialog) => action(dialog)),
  };
}
