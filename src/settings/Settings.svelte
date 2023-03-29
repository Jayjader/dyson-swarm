<script lang="ts">
  import { getContext } from "svelte";
  import { SETTINGS_CONTEXT } from "./settings";
  import { APP_UI_CONTEXT } from "../appStateStore";

  const { uiStore } = getContext(APP_UI_CONTEXT);
  const { settings } = getContext(SETTINGS_CONTEXT);
</script>

<main
  style="max-width: 23rem"
  class="m-auto flex flex-col justify-between gap-2 bg-slate-200 p-2"
>
  <h2>Settings</h2>
  <label class="flex flex-row flex-nowrap justify-around">
    <input type="checkbox" bind:checked={settings.show3dRender} />
    (Experimental) Background 3D render
  </label>
  <button
    class="rounded border-2 border-slate-900 px-2"
    on:click={uiStore.closeSettings}>Close Settings</button
  >
</main>
