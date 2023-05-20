<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import { SETTINGS_CONTEXT } from "./store";

  const { settings } = getContext(SETTINGS_CONTEXT);
  let cleared = false;

  const dispatchEvent = createEventDispatcher();
</script>

<main
  style="max-width: 23rem"
  class="m-auto flex flex-col justify-between gap-2 bg-slate-200 p-2"
>
  <h2>Settings</h2>
  <div class="flex flex-col">
    <label class="flex flex-row flex-nowrap justify-around">
      <input type="checkbox" bind:checked={$settings.show3dRender} />
      (Experimental) Background 3D render
    </label>
    <button
      class="rounded border-2 border-slate-900 px-2"
      on:click={() => ((cleared = true), dispatchEvent("clear-progress"))}
    >
      Clear Progress
      {#if cleared}
        <span class="px-2 capitalize text-zinc-700"> cleared! </span>
        <!-- spaces around text required for text-transform: capitalize to function properly -->
      {/if}
    </button>
  </div>
  <button
    class="rounded border-2 border-slate-900 px-2"
    on:click={() => dispatchEvent("close")}>Close Settings</button
  >
</main>
