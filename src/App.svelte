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
  let uiStack: AppUiState;
  uiStore.subscribe((stack: AppUiState) => {
    uiStack = stack;
  });
  setContext(APP_UI_CONTEXT, { uiStore });
</script>

{#if isAtTitle(uiStack)}
  <main class="m-2 flex flex-col justify-between rounded border-2 bg-slate-200 px-2">
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
  <main>
    <header class="flex flex-row justify-between gap-2">
      <button class="bg-red-400" on:click={uiStore.closeSaveSlots}
        >Back to Title</button
      >
      <h2>Choose a save slot</h2>
    </header>
  </main>
{:else if isInSimulation(uiStack)}
  <Simulation simulation={uiStack[1]} />
{:else if isAtSaveFromSimulation(uiStack)}
  <main>
    <header class="flex flex-row justify-between gap-2">
      <button class="bg-red-400" on:click={uiStore.closeSaveSlotsInSimulation}
        >Back to Simulation</button
      >
      <h2>Choose a save slot</h2>
      <button class="bg-red-400" on:click={uiStore.closeSimulation}
        >Close Simulation (back to title)</button
      >
    </header>
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
    width: clamp(20ch, 80dvw, 30em);
  }
</style>
