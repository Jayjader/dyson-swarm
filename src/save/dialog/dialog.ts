import { writable } from "svelte/store";
import { save_graph, type SaveDialog } from "./saveDialog";
import { delete_graph, type DeleteDialog } from "./deleteDialog";
import { load_graph, type LoadDialog } from "./loadDialog";
import { clone_graph, type CloneDialog } from "./cloneDialog";
import { export_graph, type ExportDialog } from "./exportDialog";
import { import_graph, type ImportDialog } from "./importDialog";

export type Progress<S extends string> = `progress-${S}`;
export type Failure<S extends string> = `failure-${S}`;
export type Success<S extends string> = `success-${S}`;
export type Progression<S extends string> =
  | Progress<S>
  | Failure<S>
  | Success<S>;

export type Dialog =
  | "closed"
  | DeleteDialog
  | SaveDialog
  | LoadDialog
  | CloneDialog
  | ExportDialog
  | ImportDialog;

type Action = (
  | DeleteDialog
  | SaveDialog
  | LoadDialog
  | CloneDialog
  | ExportDialog
  | ImportDialog
)["action"];
export type ActionGraph<
  action extends Action,
  dialog extends { action: action } & { state: string }
> = Record<
  "closed" | dialog["state"],
  Record<string, (...args: any) => "closed" | dialog>
>;

const GRAPHS = {
  clone: clone_graph,
  delete: delete_graph,
  export: export_graph,
  import: import_graph,
  load: load_graph,
  save: save_graph,
} as const;

function makeDialogStore<T extends Action>(action: T) {
  const graph = GRAPHS[action];
  const actionState = writable<Dialog & ("closed" | { action: T })>("closed");
  // const withGraph = derived();
  // graph[]
  return {
    subscribe: actionState.subscribe,
    // transition: (func: () => Dialog) => update(() => func()),
  };
}

/* */
function main() {
  const store = makeDialogStore("delete");
  const actions = GRAPHS["delete"];
  let currentActions;
  store.subscribe((dialog) => {
    if (dialog === "closed") {
      // do nothing as html closes modal for us
      // eventually clear any state needed; coordinate with appUiStore
      currentActions = actions["closed"];
      currentActions.startDelete("name" /*todo*/);
    } else {
      const { state } = <DeleteDialog>dialog;
      currentActions = actions[state];
    }
  });
  // {#if $store !== 'closed'}
  //   <dialog>
  //       DELETE
  //       <button on:click={store.transition.bind(this, currentActions.confirm)}>Confirm</button>
  //       <button on:click={store.transition.bind(this, currentActions.cancel)}>Cancel</button>
  //   </dialog>
  // {/if}
}
