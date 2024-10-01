<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import { makeCloneDialogStore } from "./cloneDialog";
  import { readSaveStateFromStorage, writeSlotToStorage } from "../save";
  import ErrorDisplay from "./ErrorDisplay.svelte";

  const dispatch = createEventDispatcher();

  let element: HTMLDialogElement;
  onMount(() => {
    element.showModal();
  });

  export let clonedSaveName: string;
  const store = makeCloneDialogStore();
  let current;
  let confirm, cancel;
  const storeSub = store.subscribe(({ dialog, actions }) => {
    if (dialog === "closed") {
      if (current === undefined) {
        store.act(() =>
          actions.startClone(
            new Promise((resolve, reject) => {
              const saveState = readSaveStateFromStorage(
                clonedSaveName,
                window.localStorage,
              );
              if (saveState === null) return reject(null);
              resolve(saveState);
            }),
          ),
        );
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
          : store.act.bind(this, actions.cancel);
      confirm =
        actions.confirm === undefined
          ? undefined
          : store.act.bind(this, actions.confirm);
    }

    if (dialog.state === "progress-read-save") {
      dialog.promise.then(
        (saveState) => {
          saveState.name = `${clonedSaveName} (cloned)`;
          store.act(
            actions.success.bind(
              this,
              new Promise((resolve) => {
                writeSlotToStorage(saveState, window.localStorage);
                resolve();
              }),
            ),
          );
        },
        (error) => store.act(actions.fail.bind(this, error)),
      );
    } else if (dialog.state === "progress-write-save") {
      dialog.promise.then(store.act.bind(this, actions.success), (error) =>
        store.act(actions.fail.bind(this, error)),
      );
    }
    current = { dialog, actions };
  });
  onDestroy(storeSub);
</script>

<dialog
  class="border-2 border-slate-900"
  bind:this={element}
  on:close={(event) => dispatch("close", event.target.returnValue)}
>
  <form method="dialog">
    <h3>Clone save: {clonedSaveName}</h3>
    {#if current.dialog.state === "progress-read-save"}
      <label>
        Reading save...
        <progress />
      </label>
    {:else if current.dialog.state === "failure-read-save"}
      <p class="text-red-700">Reading save failed.</p>
      <ErrorDisplay>{current.dialog.error}</ErrorDisplay>
    {:else if current.dialog.state === "progress-write-save"}
      <label>
        Writing save...
        <progress />
      </label>
    {:else if current.dialog.state === "failure-write-save"}
      <p class="text-red-700">Writing save failed.</p>
      <ErrorDisplay>{current.dialog.error}</ErrorDisplay>
    {:else if current.dialog.state === "success-clone"}
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
