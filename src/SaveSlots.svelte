<script lang="ts">
  import NavButton from "./NavButton.svelte";
  import { getContext, onDestroy } from "svelte";
  import { APP_UI_CONTEXT, simulationIsLoaded } from "./appStateStore";
  import type { SaveState } from "./events";

  type Save = { name: string } & SaveState;
  export let saveSlots: { autoSave: null | Save; slots: Save[] } = {
    autoSave: null,
    slots: [],
  };
  let slotIndex = -2;
  let inSimulation = false;
  const uiStore = getContext(APP_UI_CONTEXT).uiStore;
  const uiSub = uiStore.subscribe((stack) => {
    inSimulation = simulationIsLoaded(stack);
  });
  onDestroy(uiSub);

  const selectSlot = (index: number) => {
    slotIndex = index;
  };
</script>

<main
  style="max-width: 23rem"
  class="m-auto flex flex-col justify-between gap-2 bg-slate-200"
>
  <header class="m-2 flex flex-row justify-between gap-2">
    <nav class="flex flex-col gap-2">
      {#if slotIndex === -2}
        <NavButton
          on:click={inSimulation
            ? uiStore.closeSaveSlots
            : uiStore.closeSaveSlotsInSimulation}
          >Back&nbsp;to {#if inSimulation}Simulation{:else}Title{/if}</NavButton
        >
      {:else}
        <NavButton on:click={selectSlot.bind(this, -2)}>Cancel Choice</NavButton
        >
      {/if}
      {#if inSimulation}
        <NavButton on:click={uiStore.closeSimulation}
          >Close Simulation</NavButton
        >
      {/if}
    </nav>
    <h2>
      {#if slotIndex === -2}Choose a save slot{:else}Choose an action{/if}
    </h2>
  </header>
  <div class="m-2 flex flex-row flex-wrap justify-center gap-2">
    <button
      class:focus={slotIndex === -1}
      class={"w-full flex-grow rounded-xl border-2 border-slate-900 font-mono" +
        (saveSlots.autoSave !== null ? " bg-stone-400" : "")}
      on:click={selectSlot.bind(this, -1)}>AUTOSAVE</button
    >
    <hr class="basis-2/3 rounded border-2 border-slate-900" />
    {#each saveSlots.slots as save, i}
      <button
        class:focus={slotIndex === i}
        class="w-full flex-grow flex-grow rounded-xl border-2 border-slate-900 bg-stone-400"
        on:click={selectSlot.bind(this, i)}>{save.name}</button
      >
    {/each}
    <button
      class:focus={slotIndex === saveSlots.slots.length}
      class="w-full flex-grow flex-grow rounded-xl border-2 border-slate-900"
      on:click={selectSlot.bind(this, saveSlots.slots.length)}
      >(New Slot)</button
    >
  </div>
  <div class="m-2 grid grid-cols-3 grid-rows-2 gap-2">
    {#if inSimulation}
      <button
        class="rounded border-2 border-slate-900 disabled:border-dashed"
        disabled={slotIndex === -2}>Save</button
      >
    {:else}
      <div>
        <!--empty div to preserve how the grid auto-places the remaining buttons in a quick and dirty way-->
      </div>
    {/if}
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={slotIndex === -2}>Import</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={slotIndex === -2}>Delete</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={slotIndex === -2}>Load</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={slotIndex === -2}>Export</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={slotIndex === -2}>Clone</button
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
  button.focus {
    box-shadow: inset 0 0 0.75rem 0.5rem #0f172a /*slate-900*/;
  }
</style>
