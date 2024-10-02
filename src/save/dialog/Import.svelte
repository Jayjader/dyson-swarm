<script lang="ts">
  import { type ImportDialog, makeImportDialogStore } from "./importDialog";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import {
    deleteSave,
    migrateOldSave,
    type OldSaveState,
    type SaveState,
    writeSlotToStorage,
  } from "../save";
  import ErrorDisplay from "./ErrorDisplay.svelte";
  import { SaveJSON } from "../save.js";
  import type { Save } from "../uiStore";
  import type { EventHandler } from "svelte/elements";

  const dispatch = createEventDispatcher();
  const dispatchOnClose: EventHandler<Event, HTMLDialogElement> = (event) =>
    dispatch("close", event.target!.returnValue);

  let element: HTMLDialogElement;
  onMount(() => {
    element.showModal();
  });

  async function startParse(fileData: File) {
    const data = await fileData.text();
    let parsed = SaveJSON.parse(data) as SaveState;
    if (parsed?.version === undefined || parsed?.version === "initial-json") {
      parsed = migrateOldSave(parsed as unknown as OldSaveState);
    }
    return { name: fileData.name, ...parsed };
  }

  function startDelete() {
    return new Promise<void>((resolve) => {
      deleteSave(window.localStorage, nameToOverwrite!);
      resolve();
    });
  }

  function startWrite(save: Save) {
    return new Promise<void>((resolve) => {
      writeSlotToStorage(save, window.localStorage);
      resolve();
    });
  }

  export let nameToOverwrite: undefined | string;
  const store = makeImportDialogStore();
  let current: undefined | { dialog: ImportDialog | "closed"; actions: any };
  let confirm: undefined | (() => void);
  let cancel: undefined | (() => void);
  const storeSub = store.subscribe(({ dialog, actions }) => {
    if (dialog === "closed") {
      if (current === undefined) {
        store.act(() => actions.startImport(nameToOverwrite !== undefined));
      }
      return;
    } else if (dialog.state === "input-file") {
      cancel = () => store.act.bind(actions.cancel);
      confirm = () =>
        store.act(() => {
          const fileData = element.firstChild!.elements["fileName"].files[0];
          return actions.confirm(startParse(fileData));
        });
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
    if (dialog.state === "progress-import-save") {
      dialog.promise.then(
        (save) => {
          const overWritten = nameToOverwrite !== undefined;
          store.act(() =>
            actions.success(
              overWritten,
              overWritten ? startDelete().then(() => save) : startWrite(save),
            ),
          );
        },
        (error) => store.act(() => actions.fail(error)),
      );
    } else if (dialog.state === "progress-delete") {
      dialog.promise.then(
        (save) => store.act(() => actions.success(startWrite(save))),
        (error) => store.act(() => actions.fail(error)),
      );
    } else if (dialog.state === "progress-write-save") {
      dialog.promise.then(
        () => store.act(actions.success),
        (error) => store.act(() => actions.fail(error)),
      );
    }
    current = { dialog, actions };
  });
  onDestroy(storeSub);
</script>

<dialog
  class="border-2 border-slate-900"
  bind:this={element}
  on:close={dispatchOnClose}
>
  <form method="dialog">
    <h3>Import save</h3>
    {#if current === undefined || current.dialog === "closed"}
      This should not be visible!!!!!!!!!
    {:else if current.dialog.state === "warn-overwrite"}
      <p>
        This will delete the existing simulation data for {nameToOverwrite}.
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
