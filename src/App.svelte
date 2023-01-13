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
  import SaveSlots from "./SaveSlots.svelte";
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
    class="overflow-y-scroll m-2 flex flex-col justify-between rounded border-2 bg-slate-200 px-2"
  >
    <h1 style="font-size: clamp(2rem, 2dvh, initial)">Dyson Swarm Operator Training Simulator</h1>
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
  <SaveSlots saveSlots={SAVE_SLOTS} />
{:else if isInSimulation(uiStack)}
  <Simulation simulation={uiStack[1]} />
{:else if isAtSaveFromSimulation(uiStack)}
  <SaveSlots saveSlots={SAVE_SLOTS} />
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
</style>
