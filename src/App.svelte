<script lang="ts">
  import {
    APP_UI_CONTEXT,
    MainMenu,
    makeAppStateStore,
    SaveMenu,
    SettingsMenu,
    SimMenu,
  } from "./appStateStore";
  import Simulation from "./simulation/Simulation.svelte";
  import { setContext } from "svelte";
  import SaveSlots from "./save/SaveSlots.svelte";
  import TitleAccent from "./TitleAccent.svelte";
  import SimulationMenu from "./main-menu/SimulationMenu.svelte";
  import Settings from "./settings/Settings.svelte";
  import { makeSettingsStore, SETTINGS_CONTEXT } from "./settings/store";
  import {
    makeObjectiveTracker,
    type ObjectiveTracker,
  } from "./objectiveTracker/store";
  import { makeSimulationStore } from "./events";
  import Introduction from "./Introduction.svelte";
  import { getOrCreateSqlWorker } from "./events/sqlWorker";
  import { type Adapters, initSqlAdapters } from "./adapters";

  const settings = makeSettingsStore();
  setContext(SETTINGS_CONTEXT, { settings });
  const appStateStack = makeAppStateStore(settings);
  setContext(APP_UI_CONTEXT, { appStateStack });
  let objectiveTracker: ObjectiveTracker;

  let showIntro = false;

  let adapters: Adapters | undefined;
</script>

{#if $appStateStack.at(-1) === MainMenu}
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
        on:click={() =>
          getOrCreateSqlWorker().then((sqlWorker) => {
            appStateStack.pop();
            objectiveTracker = makeObjectiveTracker();
            objectiveTracker.setActive([0]); // Intro
            adapters = initSqlAdapters(sqlWorker);
            // adapters = initInMemoryAdapters(new Map());
            appStateStack.push(
              makeSimulationStore(objectiveTracker, adapters).loadNew(
                window.performance.now(),
              ),
              objectiveTracker,
            );
            showIntro = true;
          })}>Start New Simulation</button
      >
      <button
        class="self-stretch rounded border-2 border-slate-900 px-2"
        on:click={() => appStateStack.push(SaveMenu)}
        >Use Existing Simulation</button
      >
      <button
        class="self-stretch rounded border-2 border-slate-900 px-2"
        on:click={() => appStateStack.push(SettingsMenu)}>Settings</button
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
{:else if $appStateStack.at(-1) === SimMenu}
  <SimulationMenu
    on:open-save={() => appStateStack.push(SaveMenu)}
    on:open-settings={() => appStateStack.push(SettingsMenu)}
    on:close={(event) =>
      event.detail === "exit-sim"
        ? (appStateStack.pop(3), appStateStack.push(MainMenu))
        : appStateStack.pop()}
  />
{:else if $appStateStack.at(-1) === SettingsMenu}
  <Settings
    on:clear-progress={$appStateStack.at(2)?.clearProgress}
    on:close={() => appStateStack.pop()}
  />
{:else if $appStateStack.at(-1) === SaveMenu}
  <SaveSlots />
{:else}
  {#if showIntro && objectiveTracker}
    <Introduction
      fragments={objectiveTracker.objectives[0].details}
      on:close={() => (showIntro = false)}
    />
  {/if}
  {#if adapters !== undefined}
    <Simulation
      {adapters}
      simulation={$appStateStack[1]}
      objectives={$appStateStack[2]}
      on:open-menu={() => appStateStack.push(SimMenu)}
    />
  {/if}
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
