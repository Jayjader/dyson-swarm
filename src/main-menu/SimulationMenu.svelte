<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Close from "./Close.svelte";

  const dispatchEvent = createEventDispatcher();

  let closeDialog: HTMLDialogElement;
</script>

<main
  style="max-width: 23rem"
  class="m-auto flex flex-col justify-between gap-2 bg-slate-200 p-4"
>
  <h1>Menu</h1>
  <div class="flex flex-col gap-2">
    <button
      class="self-stretch rounded border-2 border-slate-900 p-2"
      on:click={() => dispatchEvent("open-save")}
    >
      Save / Load Simulation Data
    </button>
    <button
      class="self-stretch rounded border-2 border-slate-900 p-2"
      on:click={() => dispatchEvent("open-settings")}
    >
      Settings
    </button>
    <button
      class="self-stretch rounded border-2 border-slate-900 p-2"
      on:click={() => closeDialog.showModal()}
    >
      Close Simulation
    </button>
  </div>
  <button
    class="self-stretch rounded border-2 border-slate-900 p-2"
    on:click={() => dispatchEvent("close")}
  >
    Back
  </button>
  <Close
    bind:element={closeDialog}
    on:close={({ target: { returnValue } }) =>
      returnValue === "confirm" && dispatchEvent("close", "exit-sim")}
  />
</main>
