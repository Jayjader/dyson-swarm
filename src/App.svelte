<script lang="ts">
  import { APP_UI_CONTEXT, makeAppStateStore } from "./appStateStore";
  import Simulation from "./simulation/Simulation.svelte";
  import { setContext } from "svelte";
  import SaveSlots from "./save/SaveSlots.svelte";
  import TitleAccent from "./TitleAccent.svelte";
  import SimulationMenu from "./main-menu/SimulationMenu.svelte";
  import Settings from "./settings/Settings.svelte";
  import { makeSettingsStore, SETTINGS_CONTEXT } from "./settings/store";

  const settings = makeSettingsStore();
  setContext(SETTINGS_CONTEXT, { settings });
  const inMemory: boolean = true;
  const appStateStore = makeAppStateStore(settings, inMemory);
  setContext(APP_UI_CONTEXT, { appStateStore });

  const showIntro = false;

  async function startNewSimulation() {
    await appStateStore.startNewSim(showIntro);
  }

  function closeSettings(event: CustomEvent) {
    if (event.detail === "exit-sim") {
      appStateStore.exitSettingsAndSim();
    } else {
      appStateStore.closeSettings();
    }
  }
</script>

{#if $appStateStore.inMenu && !($appStateStore.inSave || $appStateStore.inSettings)}
  <SimulationMenu
    on:open-save={appStateStore.openSave}
    on:open-settings={appStateStore.openSettings}
    on:close={closeSettings}
  />
{:else if $appStateStore.inSettings}
  <Settings
    on:clear-progress={appStateStore.clearProgress}
    on:close={appStateStore.closeSettings}
  />
{:else if $appStateStore.inSave}
  <SaveSlots />
{:else if $appStateStore.simulation === undefined}
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
        on:click={startNewSimulation}>Start New Simulation</button
      >
      <button
        class="self-stretch rounded border-2 border-slate-900 px-2"
        on:click={appStateStore.openSave}>Use Existing Simulation</button
      >
      <button
        class="self-stretch rounded border-2 border-slate-900 px-2"
        on:click={appStateStore.openSettings}>Settings</button
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
{:else}
  <Simulation
    simulation={$appStateStore.simulation}
    on:open-menu={appStateStore.openMenu}
  />
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
