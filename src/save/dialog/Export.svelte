<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import { makeExportDialogStore } from "./exportDialog";
  import { readSaveStateFromStorage, writeSaveDataToBlob } from "../save";
  import ErrorDisplay from "./ErrorDisplay.svelte";

  const dispatch = createEventDispatcher();

  let element: HTMLDialogElement;
  onMount(() => {
    element.showModal();
  });

  export let saveName: string;
  const store = makeExportDialogStore();
  let current;
  let confirm, cancel;
  let fileName, fileData;
  const storeSub = store.subscribe(({ dialog, actions }) => {
    if (dialog === "closed") return;
    if (dialog.state === "input-filename") {
      cancel = store.act.bind(this, actions.cancel);
      confirm = store.act.bind(this, () =>
        actions.confirm(
          new Promise((resolve, reject) => {
            const saveState = readSaveStateFromStorage(
              saveName,
              window.localStorage,
            );
            if (saveState === null)
              return reject(new Error("save state is null"));
            resolve(saveState);
          }),
        ),
      );
    } else if (
      dialog.state === "progress-read-save" ||
      dialog.state === "progress-export-save"
    ) {
      confirm = undefined;
      cancel = undefined;
    } else {
      confirm =
        actions.confirm === undefined
          ? undefined
          : store.act.bind(this, actions.confirm);
      cancel =
        actions.cancel === undefined
          ? undefined
          : store.act.bind(this, actions.cancel);
    }
    if (dialog.state === "progress-read-save") {
      dialog.promise.then(
        (saveState) =>
          store.act(() =>
            actions.success(
              new Promise((resolve) => {
                const save = { name: `${fileName}.json`, ...saveState };
                writeSaveDataToBlob(save, document);
                resolve();
              }),
            ),
          ),
        (error) => store.act(actions.fail.bind(this, error)),
      );
    } else if (dialog.state === "progress-export-save") {
      dialog.promise.then(
        (data) => {
          fileData = data;
          store.act(actions.success);
        },
        (error) => store.act(actions.fail.bind(this, error)),
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
    <h3>Export save: {saveName}</h3>
    {#if current.dialog.state === "input-filename"}
      <label
        >File name<input
          name="fileName"
          type="text"
          bind:value={fileName}
          required
          autocomplete="off"
          spellcheck="false"
          autocorrect="off"
        /></label
      >
    {:else if current.dialog.state === "progress-read-save"}
      <label>
        Reading save...
        <progress />
      </label>
    {:else if current.dialog.state === "failure-read-save"}
      <p class="text-red-700">Reading save failed.</p>
      <ErrorDisplay>{current.dialog.error}</ErrorDisplay>
    {:else if current.dialog.state === "progress-export-save"}
      <label>
        Exporting save...
        <progress />
      </label>
    {:else if current.dialog.state === "failure-export-save"}
      <p class="text-red-700">Exporting save failed.</p>
      <ErrorDisplay>{current.dialog.error}</ErrorDisplay>
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
