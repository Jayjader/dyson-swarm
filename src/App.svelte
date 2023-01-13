<script lang="ts">
  import {
    uiStore,
    isAtTitle,
    isAtSaveFromTitle,
    isInSimulation,
    type AppUiState,
    isAtSaveFromSimulation,
    APP_UI_CONTEXT,
  } from "./appStateStore";
  import Simulation from "./Simulation.svelte";
  import { setContext } from "svelte";
  import { createMemoryStream } from "./events/processes/eventStream";
  import { createClock } from "./events/processes/clock";
  import NavButton from "./NavButton.svelte";
  let uiStack: AppUiState;
  uiStore.subscribe((stack: AppUiState) => {
    uiStack = stack;
  });
  setContext(APP_UI_CONTEXT, { uiStore });

  const SAVE_SLOTS = {
    autoSave: null,
    slots: [
      {
        name: "my super awesome first save",
        processors: [createMemoryStream(), createClock(0)],
      },
    ],
  } as const;
</script>

{#if isAtTitle(uiStack)}
  <main
    class="m-2 flex flex-col justify-between rounded border-2 bg-slate-200 px-2"
  >
    <h1>Dyson Swarm Operator Training Simulator</h1>
    <div class="flex flex-col gap-2 self-center">
      <button
        class="self-stretch rounded border-2 border-slate-900 px-2"
        on:click={uiStore.startNewSimulation}>Start New Simulation</button
      >
      <button
        class="self-stretch rounded border-2 border-slate-900 px-2"
        on:click={uiStore.viewSaveSlots}>Use Existing Simulation</button
      >
      <a
        class="text-slate-700 hover:underline hover:visited:text-slate-500"
        href="https://github.com/Jayjader/dyson-swarm#readme"
        target="_blank"
        rel="noreferrer"
      >
        Credits & Attribution
      </a>
    </div>
  </main>
{:else if isAtSaveFromTitle(uiStack)}
  <main
    style="max-width: 23rem"
    class="m-auto flex flex-col justify-between gap-2 bg-slate-200"
  >
    <header class="m-2 flex flex-row justify-between gap-2">
      <NavButton on:click={uiStore.closeSaveSlots}>Back to Title</NavButton>
      <h2>Choose a save slot</h2>
    </header>
    <div class="m-2 flex flex-row flex-wrap justify-center gap-2">
      <button
        class={"slot flex-grow rounded-xl border-2 border-slate-900" +
          (SAVE_SLOTS.autoSave !== null ? " bg-stone-400" : "")}
        >AUTOSAVE</button
      >
      <hr class="basis-2/3 rounded border-2 border-slate-900"/>
      {#each SAVE_SLOTS.slots as save}
        <button
          class="slot flex-grow flex-grow rounded-xl border-2 border-slate-900 bg-stone-400"
          >{save.name}</button
        >
      {/each}
      <button
        class="slot flex-grow flex-grow rounded-xl border-2 border-slate-900"
        >(New Slot)</button
      >
    </div>
    <div class="m-2 grid grid-cols-3 grid-rows-2 gap-2">
      {#if isAtSaveFromTitle(uiStack)}
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
{:else if isInSimulation(uiStack)}
  <Simulation simulation={uiStack[1]} />
{:else if isAtSaveFromSimulation(uiStack)}
  <main
    style="max-width: 23rem"
    class="m-auto flex flex-col justify-between gap-2 bg-slate-200"
  >
    <header class="m-2 flex flex-row justify-between gap-2">
      <nav class="flex flex-col gap-2">
        <NavButton on:click={uiStore.closeSaveSlotsInSimulation}
          >Back to Simulation</NavButton
        >
        <NavButton on:click={uiStore.closeSimulation}
          >Close Simulation</NavButton
        >
      </nav>
      <h2 style="font-size: clamp(2rem, 30dvw, 100%)">Choose a save slot</h2>
    </header>
    <div class="m-2 flex flex-row flex-wrap justify-center gap-2">
      <button
        class={"slot flex-grow rounded-xl border-2 border-slate-900" +
          (SAVE_SLOTS.autoSave !== null ? " bg-stone-400" : "")}
        >AUTOSAVE</button
      >
      <hr class="basis-2/3 rounded border-2 border-slate-900"/>
      {#each SAVE_SLOTS.slots as save}
        <button
          class="slot flex-grow flex-grow rounded-xl border-2 border-slate-900 bg-stone-400"
          >{save.name}</button
        >
      {/each}
      <button
        class="slot flex-grow flex-grow rounded-xl border-2 border-slate-900"
        >(New Slot)</button
      >
    </div>
    <div class="m-2 grid grid-cols-3 grid-rows-2 gap-2">
      {#if isAtSaveFromTitle(uiStack)}
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
{/if}

<style>
  main {
    min-height: 30dvh;
    height: calc(100dvh - 2.5em);
    max-height: calc(100dvh - 2.5em);
  }
  button {
    min-height: 3rem;
  }
  button.slot {
    width: clamp(20ch, 80dvw, 30em);
  }
</style>
