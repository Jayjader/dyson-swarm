<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import { makeCloneDialogStore } from "./cloneDialog";
  import { readSave, writeSlotToStorage } from "../save";

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
    console.info({ dialog, actions });
    if (dialog === "closed") {
      if (current === undefined) {
        store.act(() =>
          actions.startClone(
            new Promise((resolve, reject) => {
              const saveState = readSave(clonedSaveName, window.localStorage);
              if (saveState === null) return reject(null);
              resolve(saveState);
            })
          )
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
      dialog.promise.then((saveState) => {
        saveState.name = `${clonedSaveName} (cloned)`;
        store.act(() =>
          actions.success(
            new Promise((resolve) => {
              writeSlotToStorage(saveState, window.localStorage);
              resolve();
            })
          )
        );
      }, store.act.bind(this, actions.fail));
    } else if (dialog.state === "progress-write-save") {
      dialog.promise.then(
        store.act.bind(this, actions.success),
        store.act.bind(this, actions.fail)
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
      <p class="rounded border-2 border-red-700">Reading save failed.</p>
      <p class="text-red-700">TODO ERROR MESSAGE</p>
    {:else if current.dialog.state === "progress-write-save"}
      <label>
        Writing save...
        <progress />
      </label>
    {:else if current.dialog.state === "failure-write-save"}
      <p class="rounded border-2 border-red-700">Writing save failed.</p>
      <p class="text-red-700">TODO ERROR MESSAGE</p>
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
