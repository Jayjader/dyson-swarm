<script lang="ts">
  import NavButton from "./NavButton.svelte";
  import { getContext } from "svelte";
  import { APP_UI_CONTEXT, isAtSaveFromTitle } from "./appStateStore";
  import type { SaveState } from "./events";

  type Save = { name: string } & SaveState;
  export let saveSlots: { autoSave: null | Save; slots: Save[] } = {
    autoSave: null,
    slots: [],
  };
  export let simulationData: null | SaveState = null;
  const uiStore = getContext(APP_UI_CONTEXT).uiStore;
</script>

<main
  style="max-width: 23rem"
  class="m-auto flex flex-col justify-between gap-2 bg-slate-200"
>
  <header class="m-2 flex flex-row justify-between gap-2">
    <nav class="flex flex-col gap-2">
      <NavButton
        on:click={simulationData === null
          ? uiStore.closeSaveSlots
          : uiStore.closeSaveSlotsInSimulation}
        >Back to {#if simulationData === null}Title{:else}Simulation{/if}</NavButton
      >
      {#if simulationData !== null}
        <NavButton on:click={uiStore.closeSimulation}
          >Close Simulation</NavButton
        >
      {/if}
    </nav>
    <h2>Choose a save slot</h2>
  </header>
  <div class="m-2 flex flex-row flex-wrap justify-center gap-2">
    <button
      class={"w-full flex-grow rounded-xl border-2 border-slate-900" +
        (saveSlots.autoSave !== null ? " bg-stone-400" : "")}>AUTOSAVE</button
    >
    <hr class="basis-2/3 rounded border-2 border-slate-900" />
    {#each saveSlots.slots as save}
      <button
        class="w-full flex-grow flex-grow rounded-xl border-2 border-slate-900 bg-stone-400"
        >{save.name}</button
      >
    {/each}
    <button
      class="w-full flex-grow flex-grow rounded-xl border-2 border-slate-900"
      >(New Slot)</button
    >
  </div>
  <div class="m-2 grid grid-cols-3 grid-rows-2 gap-2">
    {#if simulationData === null}
      <div>
        <!--empty div to preserve grid auto-placing in a quick and dirty way-->
      </div>
    {:else}
      <button class="rounded border-2 border-slate-900 disabled:border-dashed"
        >Save</button
      >
    {/if}
    <button class="rounded border-2 border-slate-900 disabled:border-dashed"
      >Import</button
    >
    <button class="rounded border-2 border-slate-900 disabled:border-dashed"
      >Delete</button
    >
    <button class="rounded border-2 border-slate-900 disabled:border-dashed"
      >Load</button
    >
    <button class="rounded border-2 border-slate-900 disabled:border-dashed"
      >Export</button
    >
    <button class="rounded border-2 border-slate-900 disabled:border-dashed"
      >Clone</button
    >
  </div>
</main>

<style>
  main {
    min-height: 30dvh;
    height: calc(100dvh - 2.5em);
    max-height: calc(100dvh - 2.5em);
  }
  button {
    min-height: 4rem;
  }
</style>
