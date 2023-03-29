<script lang="ts">
  import { APP_UI_CONTEXT } from "../appStateStore";
  import { getContext } from "svelte";
  import Close from "./Close.svelte";

  const { uiStore } = getContext(APP_UI_CONTEXT);
  let closeDialog: HTMLDialogElement;
</script>

<main
  style="max-width: 23rem"
  class="m-auto flex flex-col justify-between gap-2 bg-slate-200 p-2"
>
  <h1>Menu</h1>
  <div class="flex flex-col gap-2">
    <button
      class="self-stretch rounded border-2 border-slate-900 px-2"
      on:click={uiStore.viewSaveSlotsInSimulation}
    >
      Save
    </button>
    <button
      class="self-stretch rounded border-2 border-slate-900 px-2"
      on:click={uiStore.viewSettings}
    >
      Settings
    </button>
    <button
      class="self-stretch rounded border-2 border-slate-900 px-2"
      on:click={() => closeDialog.showModal()}
    >
      Close Simulation
    </button>
  </div>
  <button
    class="self-stretch rounded border-2 border-slate-900 px-2"
    on:click={uiStore.closeMenu}
  >
    Back
  </button>
  <Close
    bind:element={closeDialog}
    on:close={({ detail }) => detail === "confirm" && uiStore.closeSimulation()}
  />
</main>
