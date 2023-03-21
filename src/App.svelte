<script lang="ts">
  import {
    APP_UI_CONTEXT,
    type AppUiState,
    isAtSaveFromSimulation,
    isAtSaveFromTitle,
    isAtTitle,
    isInSimulation,
    uiStore,
  } from "./appStateStore";
  import Simulation from "./simulation/Simulation.svelte";
  import { setContext } from "svelte";
  import SaveSlots from "./save/SaveSlots.svelte";
  import TitleAccent from "./TitleAccent.svelte";

  let uiStack: AppUiState;
  uiStore.subscribe((stack: AppUiState) => {
    uiStack = stack;
  });
  setContext(APP_UI_CONTEXT, { uiStore });
</script>

{#if isAtTitle(uiStack)}
  <main
    class="m-2 flex flex-col justify-between overflow-y-scroll rounded border-2 bg-slate-200 px-2"
  >
    <h1 style="font-size: clamp(2rem, 2dvh, initial)">
      <TitleAccent>D</TitleAccent>yson Swarm
      <TitleAccent>O</TitleAccent>perator
      <TitleAccent>T</TitleAccent>raining
      <TitleAccent>S</TitleAccent>imulator
    </h1>
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
{:else if isAtSaveFromTitle(uiStack) | isAtSaveFromSimulation(uiStack)}
  <SaveSlots />
{:else if isInSimulation(uiStack)}
  <Simulation simulation={uiStack[1]} />
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
