<script lang="ts">
  import {
    APP_UI_CONTEXT,
    MainMenu,
    SaveMenu,
    SettingsMenu,
  } from "../appStateStore";
  import { getContext } from "svelte";
  import Close from "./Close.svelte";

  const { appStateStack } = getContext(APP_UI_CONTEXT);
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
      on:click={() => appStateStack.push(SaveMenu)}
    >
      Save / Load Progress
    </button>
    <button
      class="self-stretch rounded border-2 border-slate-900 px-2"
      on:click={() => appStateStack.push(SettingsMenu)}
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
    on:click={() => appStateStack.pop()}
  >
    Back
  </button>
  <Close
    bind:element={closeDialog}
    on:close={({ detail }) =>
      detail === "confirm" &&
      appStateStack.pop(3) &&
      appStateStack.push(MainMenu)}
  />
</main>
