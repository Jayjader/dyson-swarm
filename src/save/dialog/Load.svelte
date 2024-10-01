<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import { type LoadDialog, makeLoadDialogStore } from "./loadDialog";
  import { readSaveStateFromStorage, type SaveState } from "../save";
  import ErrorDisplay from "./ErrorDisplay.svelte";
  import type { EventHandler } from "svelte/elements";

  const dispatch = createEventDispatcher();

  let element: HTMLDialogElement;
  onMount(() => {
    element.showModal();
  });

  export let name: string;
  export let simulationLoaded: boolean;
  const store = makeLoadDialogStore();
  let current: undefined | { dialog: LoadDialog | "closed"; actions: any };
  let confirm: undefined | (() => void);
  let cancel: undefined | (() => void);
  let loadedSaveState: undefined | SaveState;
  const storeSub = store.subscribe(({ dialog, actions }) => {
    if (dialog === "closed") {
      if (current === undefined) {
        store.act(() =>
          actions.startLoad({
            inSimulation: simulationLoaded,
            promise: simulationLoaded
              ? undefined
              : new Promise((resolve, reject) => {
                  const saveState = readSaveStateFromStorage(
                    name,
                    window.localStorage,
                  );
                  if (saveState === null) reject(null);
                  resolve(saveState);
                }),
          }),
        );
      }
      return;
    } else if (dialog.state === "warn-discard") {
      confirm = () =>
        store.act((...args) =>
          actions.confirm(
            new Promise((resolve, reject) => {
              const saveState = readSaveStateFromStorage(
                name,
                window.localStorage,
              );
              if (saveState === null) return reject(null);
              resolve(saveState);
            }),
            ...args,
          ),
        );
      cancel = () => store.act(actions.cancel);
    } else if (dialog.state === "progress-read-save") {
      confirm = undefined;
      cancel = undefined;
    } else if (dialog.state === "success-read-save") {
      confirm = () => store.act(actions.confirm);
    } else {
      confirm =
        actions.confirm === undefined
          ? undefined
          : () => store.act(actions.confirm);
      cancel =
        actions.cancel === undefined
          ? undefined
          : () => store.act(actions.cancel);
    }
    if (dialog.state === "progress-read-save") {
      dialog.promise.then(
        (saveState) => {
          loadedSaveState = saveState;
          store.act(actions.success);
        },
        (error) => store.act(() => actions.fail(error)),
      );
    }
    current = { dialog, actions };
  });
  onDestroy(storeSub);
  const dispatchCloseEvent: EventHandler<Event, HTMLDialogElement> = (
    event,
  ) => {
    dispatch("close", {
      button: event.target!.returnValue,
      saveState: loadedSaveState,
    });
  };
</script>

<dialog
  class="border-2 border-slate-900"
  bind:this={element}
  on:close={dispatchCloseEvent}
>
  <form method="dialog">
    <h3>Load save</h3>
    {#if current === undefined || current.dialog === "closed"}
      This should not be visible!!!!!!!!!
    {:else}
      {#if current?.dialog.state === "warn-discard"}
        <p>
          This will discard any unsaved data from the current simulation.
          Discard unsaved data?
        </p>
      {:else if current?.dialog.state === "progress-read-save"}
        <label>
          Reading save...
          <progress />
        </label>
      {:else if current?.dialog.state === "success-read-save"}
        <p>Save read.</p>
      {:else if current?.dialog.state === "failure-read-save"}
        <p class="text-red-700">Reading save failed.</p>
        <ErrorDisplay>{current?.dialog.error}</ErrorDisplay>
      {/if}
      <div class="flex flex-row justify-between gap-2">
        {#if confirm}
          <button
            class="my-2 rounded border-2 border-slate-900 px-2"
            on:click={confirm}
            value="confirm">Confirm</button
          >
        {/if}
        {#if cancel}
          <button
            class="my-2 rounded border-2 border-slate-900 px-2"
            on:click={cancel}
            value="cancel"
            formnovalidate>Cancel</button
          >
        {/if}
      </div>
    {/if}
  </form>
</dialog>
