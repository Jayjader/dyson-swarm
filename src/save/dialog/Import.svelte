<script lang="ts">
  import { makeImportDialogStore } from "./importDialog";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import { deleteSave, type SaveState, writeSlotToStorage } from "../save";
  import ErrorDisplay from "./ErrorDisplay.svelte";
  import { SaveJSON } from "../save.js";

  const dispatch = createEventDispatcher();

  let element: HTMLDialogElement;
  onMount(() => {
    element.showModal();
  });

  export let overWrittenName: undefined | string;
  const store = makeImportDialogStore();
  let current;
  let confirm, cancel;
  const storeSub = store.subscribe(({ dialog, actions }) => {
    if (dialog === "closed") {
      if (current === undefined) {
        store.act(
          actions.startImport.bind(this, overWrittenName !== undefined),
        );
      }
      return;
    } else if (dialog.state === "input-file") {
      cancel = store.act.bind(this, actions.cancel);
      confirm = store.act.bind(this, () => {
        const fileData = element.firstChild!.elements["fileName"].files[0];
        return actions.confirm(
          fileData.text().then((data) => {
            return {
              name: fileData.name,
              ...(SaveJSON.parse(data) as SaveState),
            };
          }),
        );
      });
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
    if (dialog.state === "progress-import-save") {
      dialog.promise.then(
        (save) => {
          const overWritten = overWrittenName !== undefined;
          store.act(
            actions.success.bind(
              this,
              overWritten,
              overWritten
                ? new Promise((resolve) => {
                    deleteSave(window.localStorage, overWrittenName!);
                    resolve(save);
                  })
                : new Promise<void>((resolve) => {
                    writeSlotToStorage(save, window.localStorage);
                    resolve();
                  }),
            ),
          );
        },
        (error) => store.act(actions.fail.bind(this, error)),
      );
    } else if (dialog.state === "progress-delete") {
      dialog.promise.then(
        (save) =>
          store.act(() =>
            actions.success(
              new Promise<void>((resolve) => {
                writeSlotToStorage(save, window.localStorage);
                resolve();
              }),
            ),
          ),
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
    <h3>Import save</h3>
    {#if current.dialog.state === "warn-overwrite"}
      <p>
        This will delete the existing simulation data for {overWrittenName}.
        Delete saved data?
      </p>
    {:else if current.dialog.state === "input-file"}
      <label>Pick file<input name="fileName" type="file" required /></label>
    {:else if current.dialog.state === "progress-import-save"}
      <label>
        Importing save...
        <progress />
      </label>
    {:else if current.dialog.state === "failure-import-save"}
      <p class="text-red-700">Importing save failed.</p>
      <ErrorDisplay>{current.dialog.error}</ErrorDisplay>
    {:else if current.dialog.state === "progress-delete"}
      <label>
        Deleting previous save...
        <progress />
      </label>
    {:else if current.dialog.state === "failure-delete"}
      <p class="text-red-700">Deleting previous save failed.</p>
      <ErrorDisplay>{current.dialog.error}</ErrorDisplay>
    {:else if current.dialog.state === "progress-write-save"}
      <label>
        Writing imported save...
        <progress />
      </label>
    {:else if current.dialog.state === "failure-write-save"}
      <p class="text-red-700">Writing imported save failed.</p>
      <ErrorDisplay>{current.dialog.error}</ErrorDisplay>
    {:else if current.dialog.state === "success-write-save"}
      <p>Imported save written.</p>
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
