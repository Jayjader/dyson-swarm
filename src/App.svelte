<!-- @component Top-level of dyson swarm application -->
<script lang="ts">
  import "./app.css";
  import ResourceHud from "./hud/ResourceHud.svelte";
  import SwarmHud from "./hud/SwarmHud.svelte";
  import Fabricator from "./panels/fabricator/Fabricator.svelte";
  import { onDestroy, setContext } from "svelte";
  import { Resource } from "./gameRules";
  import PanelSelector from "./panel-control/PanelSelector.svelte";
  import { uiPanelsState } from "./panel-control/store";
  import TimeControl from "./hud/TimeControl.svelte";
  import ProgressOverview from "./hud/ProgressOverview.svelte";
  import ConstructOverview from "./panels/constructs/ConstructOverview.svelte";
  import StorageOverview from "./panels/storage/StorageOverview.svelte";
  import {
    blankSave,
    type Simulation,
    SIMULATION_STORE,
    store as simulation,
  } from "./events";
  import { swarmCount } from "./events/processes/satelliteSwarm";
  import { readStored } from "./events/processes/storage";
  import { gridState } from "./events/processes/powerGrid";
  import { createClock } from "./events/processes/clock";
  import { createMemoryStream } from "./events/processes/eventStream";

  const readStoredResource = (
    simulation: Simulation,
    resource: Resource
  ): number =>
    resource === Resource.ELECTRICITY
      ? gridState(simulation).stored
      : readStored(simulation, resource);

  simulation.loadSave(blankSave());
  let timeStampOfLastTick = window.performance.now();
  let clockFrame: number = 0;
  simulation.insertProcessors(
    createMemoryStream(),
    createClock(timeStampOfLastTick, "clock-0", { mode: "pause" })
  );

  setContext(SIMULATION_STORE, { simulation });

  let resources = new Map();
  let swarm = 0;

  const unsubscribe = simulation.subscribe((sim) => {
    // if (clockFrame % (20 * 60) === 0) {
    //   console.debug({ sim });
    // }
    [
      Resource.ELECTRICITY,
      Resource.ORE,
      Resource.METAL,
      Resource.PACKAGED_SATELLITE,
    ].forEach((resource) =>
      resources.set(resource, readStoredResource(sim, resource))
    );
    resources = resources;
    swarm = swarmCount(sim);
  });

  function scheduleCallback(callback) {
    clockFrame = window.requestAnimationFrame(callback);
    // console.debug({ command: "schedule-callback", animationFrame: clockFrame });
  }
  function cancelCallback() {
    console.debug({ command: "cancel-callback", animationFrame: clockFrame });
    window.cancelAnimationFrame(clockFrame);
    clockFrame = 0;
  }

  function outsideClockLoop(timeStamp: DOMHighResTimeStamp) {
    if (swarm >= 2 ** 50) {
      cancelCallback();
      return alert(
        "You've successfully launched enough satellites into the star's orbit to capture and redirect the majority of its output!\nThanks for playing for so long with such tedious controls 😅\nIf you want to play again, please refresh the page.\nThis game is not finished being developed. While there is no way to subscribe to updates (yet), a good rule of thumb is to be ready to wait several months before a new version is published."
      );
    }
    simulation.broadcastEvent({ tag: "outside-clock-tick", timeStamp });
    simulation.processUntilSettled();
    scheduleCallback(outsideClockLoop);
  }

  onDestroy(unsubscribe);
  onDestroy(window.cancelAnimationFrame.bind(window, clockFrame));

  let showProgress = true;

  scheduleCallback(outsideClockLoop);
</script>

<main
  class="m-0 flex flex-col flex-nowrap items-stretch justify-between gap-2 p-0"
>
  <div class="flex flex-grow-0 flex-col gap-2">
    <div class="flex flex-row justify-between text-stone-200">
      <ResourceHud {resources} />
      <SwarmHud count={swarm} />
    </div>

    <div class="flex flex-row flex-wrap justify-around gap-2">
      <TimeControl />
      {#if swarm > 0}
        <button
          on:click={() => {
            showProgress = !showProgress;
          }}
          class="max-w-min break-normal rounded border-2 border-slate-100 text-stone-300"
          >{#if showProgress}Hide{:else}Show{/if} Progress</button
        >
        {#if showProgress}
          <ProgressOverview count={swarm} />
        {/if}
      {/if}
    </div>
  </div>

  <div class="panels grid-auto grid overflow-y-scroll" style="--gap: 0.5rem">
    {#if $uiPanelsState.has("construct-overview")}
      <ConstructOverview />
    {/if}
    {#if $uiPanelsState.has("storage-overview")}
      <StorageOverview {resources} />
    {/if}
    {#if $uiPanelsState.has("fabricator")}
      <Fabricator />
    {/if}
  </div>
  <PanelSelector />
</main>
<a
  class="text-slate-400 hover:underline hover:visited:text-slate-500"
  href="https://github.com/Jayjader/dyson-swarm#readme"
  target="_blank"
  rel="noreferrer"
>
  Credits & Attribution
</a>

<style>
  main {
    height: calc(100dvh - 2.5em);
    max-height: calc(100dvh - 2.5em);
  }
  .grid-auto {
    --gap: initial;
    gap: var(--gap);
    /*
    thank you css tricks for the following implementation of a grid with:
     - max number of columns (this is grid/gutter columns, not "columns of content" => +1)
     - min width of column content
     https://css-tricks.com/an-auto-filling-css-grid-with-max-columns/
    */
    --max-columns: 3;
    --item-min-width: 20rem;
    --item-max-width: calc(
      (100% - ((var(--max-columns) - 1) * var(--gap))) /
        (var(--max-columns) - 1)
    );
    grid-template-columns: repeat(
      auto-fill,
      minmax(max(var(--item-min-width), var(--item-max-width)), 1fr)
    );
  }
</style>
