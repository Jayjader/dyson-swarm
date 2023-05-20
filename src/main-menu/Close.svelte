<script lang="ts">
  export let element: HTMLDialogElement;
</script>

<dialog class="border-2 border-slate-900" bind:this={element} on:close>
  <form method="dialog">
    <h3>Warning</h3>
    <p>
      This will discard any unsaved data from the current simulation. Discard
      unsaved data?
    </p>
    <div class="flex flex-row justify-between gap-2">
      <button
        class="my-2 rounded border-2 border-slate-900 px-2"
        value="confirm">Confirm</button
      >
      <button class="my-2 rounded border-2 border-slate-900 px-2" value="cancel"
        >Cancel</button
      >
    </div>
  </form>
</dialog>
