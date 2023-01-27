<script lang="ts">
  import type { Readable } from "svelte/store";
  import { makeDeleteDialogStore } from "./deleteDialog";
  import { deleteSave } from "../save";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";

  type StoreValue<Store> = Store extends Readable<infer V> ? V : never;

  const dispatch = createEventDispatcher();

  export let name: string;
  let element: HTMLDialogElement;
  const store = makeDeleteDialogStore(name);
  let current: StoreValue<typeof store>;
  let confirm, cancel;
  const storeSub = store.subscribe(({ dialog, actions }) => {
    if (dialog === "closed") return;
    if (dialog.state === "warn-discard") {
      confirm = store.act.bind(this, (...args) =>
        actions.confirm(
          new Promise((resolve) => {
            deleteSave(window.localStorage, dialog.name);
            resolve();
          }),
          ...args
        )
      );
      cancel = store.act.bind(this, actions.cancel);
    } else if (dialog.state === "progress-delete") {
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
    if (dialog.state === "progress-delete") {
      dialog.promise.then(
        store.act.bind(this, actions.success),
        store.act.bind(this, actions.fail)
      );
    }
    current = { dialog, actions };
  });
  onDestroy(storeSub);
  onMount(() => {
    element.showModal();
  });
</script>

<dialog
  class="border-2 border-slate-900"
  bind:this={element}
  on:close={(event) => dispatch("close", event.target.returnValue)}
>
  <form method="dialog">
    <h3>Delete save: {current.dialog.name}</h3>
    {#if current.dialog.state === "warn-discard"}
      <p>
        This will delete the existing simulation data in this save slot. Delete
        saved data?
      </p>
    {:else if current.dialog.state === "progress-delete"}
      <label>
        Deleting...
        <progress />
      </label>
    {:else if current.dialog.state === "success-delete"}
      <p>Save deleted.</p>
    {:else if current.dialog.state === "failure-delete"}
      <p class="rounded border-2 border-red-700">Deleting save failed.</p>
      <p class="text-red-700">TODO ERROR MESSAGE</p>
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
          value="cancel">Cancel</button
        >
      {/if}
    </div>
  </form>
</dialog>
