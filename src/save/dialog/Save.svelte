<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import { makeSaveDialogStore } from "./saveDialog";
  import { deleteSave, generateSave, writeSlotToStorage } from "../save";
  import type { Simulation } from "../../events";

  const dispatch = createEventDispatcher();

  let element: HTMLDialogElement;
  onMount(() => {
    element.showModal();
  });

  export let simulationState: Simulation;
  export let overWrittenName: undefined | string;
  const store = makeSaveDialogStore(overWrittenName !== undefined);
  let current;
  let confirm, cancel;
  let saveName = "";
  const storeSub = store.subscribe(({ dialog, actions }) => {
    if (dialog === "closed") return;
    if (dialog.state === "warn-overwrite") {
      cancel = store.act.bind(this, actions.cancel);
      confirm = store.act.bind(this, (...args) =>
        actions.confirm(
          new Promise((resolve) => {
            deleteSave(window.localStorage, overWrittenName!);
            resolve();
          }),
          ...args
        )
      );
    } else if (
      dialog.state === "progress-delete" ||
      dialog.state === "progress-write-save"
    ) {
      confirm = undefined;
      cancel = undefined;
    } else if (dialog.state === "input-savename") {
      confirm = store.act.bind(this, (...args) =>
        actions.confirm(
          saveName,
          new Promise((resolve) => {
            writeSlotToStorage(
              { ...generateSave(simulationState), name: saveName },
              window.localStorage
            );
            resolve();
          }),
          ...args
        )
      );
      cancel = store.act.bind(this, actions.cancel);
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
    if (
      dialog.state === "progress-delete" ||
      dialog.state === "progress-write-save"
    ) {
      dialog.promise.then(
        store.act.bind(this, actions.success),
        store.act.bind(this, actions.fail)
      );
    }
    current = { dialog, actions };
  });
  onDestroy(storeSub);

  export let saveNames: string[];
  $: saveNamePattern =
    "^" +
    (saveNames.length > 0 ? "(?!" + saveNames.join(")|(?!") + ")" : "") +
    ".+$";
</script>

<dialog
  class="border-2 border-slate-900"
  bind:this={element}
  on:close={(event) => dispatch("close", event.target.returnValue)}
>
  <form method="dialog">
    <h3>New save</h3>
    {#if current.dialog.state === "warn-overwrite"}
      <p>
        This will delete the existing simulation data for {overWrittenName}.
        Delete saved data?
      </p>
    {:else if current.dialog.state === "progress-delete"}
      <label>
        Deleting previous save...
        <progress />
      </label>
    {:else if current.dialog.state === "success-delete"}
      <p>Previous save deleted.</p>
    {:else if current.dialog.state === "failure-delete"}
      <p class="rounded border-2 border-red-700">Deleting previous save failed.</p>
      <p class="text-red-700">TODO ERROR MESSAGE</p>
    {:else if current.dialog.state === "input-savename"}
      <label
        >Save name<input
          class="rounded border-2 border-slate-900 px-2"
          name="saveName"
          type="text"
          title="Cannot be the same as an existing save name"
          bind:value={saveName}
          required
          pattern={saveNamePattern}
          autocomplete="off"
          spellcheck="false"
          autocorrect="off"
        /></label
      >
    {:else if current.dialog.state === "progress-write-save"}
      <label>
        Saving...
        <progress />
      </label>
    {:else if current.dialog.state === "success-write-save"}
      <p>Saved.</p>
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
