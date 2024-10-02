<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import {
    type CloneDialog,
    makeCloneDialogStore,
    type StoreState,
  } from "./cloneDialog";
  import { readSaveStateFromStorage, writeSlotToStorage } from "../save";
  import ErrorDisplay from "./ErrorDisplay.svelte";
  import type { EventHandler } from "svelte/elements";
  import type { Save } from "../uiStore";

  const dispatch = createEventDispatcher();

  let element: HTMLDialogElement;
  onMount(() => {
    element.showModal();
  });

  const onDialogClose: EventHandler<Event, HTMLDialogElement> = (event) =>
    dispatch("close", event.target!.returnValue);

  export let clonedSaveName: string;
  function startRead() {
    return new Promise((resolve, reject) => {
      const saveState = readSaveStateFromStorage(
        clonedSaveName,
        window.localStorage,
      );
      if (saveState !== null) {
        resolve(saveState);
      } else {
        reject(null);
      }
    });
  }
  function startWrite(saveState: Save) {
    return new Promise<void>((resolve) => {
      writeSlotToStorage(saveState, window.localStorage);
      resolve();
    });
  }
  const store = makeCloneDialogStore();
  let current: undefined | StoreState<CloneDialog | "closed">;
  let confirm: undefined | (() => void);
  let cancel: undefined | (() => void);
  const storeSub = store.subscribe(({ dialog, actions }) => {
    if (dialog === "closed") {
      if (current === undefined) {
        store.act(() => actions.startClone(startRead()));
      }
      return;
    } else if (
      dialog.state === "progress-read-save" ||
      dialog.state === "progress-write-save"
    ) {
      confirm = undefined;
      cancel = undefined;
    } else {
      cancel =
        actions.cancel === undefined
          ? undefined
          : () => store.act(actions.cancel);
      confirm =
        actions.confirm === undefined
          ? undefined
          : () => store.act(actions.confirm);
    }

    if (dialog.state === "progress-read-save") {
      dialog.promise.then(
        (saveState) => {
          saveState.name = `${clonedSaveName} (cloned)`;
          store.act(() => actions.success(startWrite(saveState)));
        },
        (error) => store.act(() => actions.fail(error)),
      );
    } else if (dialog.state === "progress-write-save") {
      dialog.promise.then(
        () => store.act(actions.success),
        (error) => store.act(() => actions.fail(error)),
      );
    }
    current = { dialog, actions } as StoreState<typeof dialog>;
  });
  onDestroy(storeSub);
</script>

<dialog
  class="border-2 border-slate-900"
  bind:this={element}
  on:close={onDialogClose}
>
  <form method="dialog">
    <h3>Clone save: {clonedSaveName}</h3>
    {#if current === undefined || current.dialog === "closed"}
      This should not be visible!!!!!!!!!
    {:else if current && current.dialog.state === "progress-read-save"}
      <label>
        Reading save...
        <progress />
      </label>
    {:else if current && current.dialog.state === "failure-read-save"}
      <p class="text-red-700">Reading save failed.</p>
      <ErrorDisplay>{current.dialog.error}</ErrorDisplay>
    {:else if current && current.dialog.state === "progress-write-save"}
      <label>
        Writing save...
        <progress />
      </label>
    {:else if current && current.dialog.state === "failure-write-save"}
      <p class="text-red-700">Writing save failed.</p>
      <ErrorDisplay>{current.dialog.error}</ErrorDisplay>
    {:else if current && current.dialog.state === "success-clone"}
      <p>Save cloned.</p>
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
  </form>
</dialog>
