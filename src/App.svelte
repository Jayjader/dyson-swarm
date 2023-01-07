<!-- @component Top-level of dyson swarm application -->
<script lang="ts">
  import "./app.css";
  import ResourceHud from "./ResourceHud.svelte";
  import SwarmHud from "./hud/SwarmHud.svelte";
  import Fabricator from "./fabricator/Fabricator.svelte";
  import { onDestroy, setContext } from "svelte";
  import type { GameState } from "./gameStateStore";
  import { Resource } from "./gameStateStore";
  import { fabricator } from "./fabricator/store";
  import PanelSelector from "./panel-control/PanelSelector.svelte";
  import { uiPanelsState } from "./panel-control/store";
  import TimeControl from "./time/TimeControl.svelte";
  import ProgressOverview from "./overview/ProgressOverview.svelte";
  import ConstructOverview from "./overview/ConstructOverview.svelte";
  import StorageOverview from "./overview/StorageOverview.svelte";
  import {
    blankSave,
    type Simulation,
    SIMULATION_STORE,
    store as simulation,
  } from "./events";
  import { createMemoryStream } from "./events/processes";
  import { swarmCount } from "./events/processes/satelliteSwarm";
  import { readStored } from "./events/processes/storage";
  import { gridState } from "./events/processes/powerGrid";
  import { createClock } from "./events/processes/clock";

  export let init: GameState;

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

  function readStoredResource(
    simulation: Simulation,
    resource: Resource
  ): number {
    return resource === Resource.ELECTRICITY
      ? gridState(simulation).stored
      : readStored(simulation, resource);
  }
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

  function advanceClock(
    nextTimeStamp: DOMHighResTimeStamp,
    options: { resume: boolean } = { resume: false }
  ) {
    // don't catch up passed time if clock was paused
    if (options.resume) {
      timeStampOfLastTick = nextTimeStamp;
    }
    const timeElapsed = Math.floor(nextTimeStamp - timeStampOfLastTick);
  }

  onDestroy(unsubscribe);
  onDestroy(window.cancelAnimationFrame.bind(window, clockFrame));
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
        <ProgressOverview count={swarm} />
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
      <Fabricator {resources} />
    {/if}
  </div>
  <PanelSelector />
</main>

<style>
  main {
    height: calc(100vh - 1rem);
    max-height: calc(100vh - 1rem);
  }
  .panels {
    min-height: 10rem;
  }
  .grid-auto {
    --gap: initial;
    gap: var(--gap);
    /*
    thank you css tricks for the following implementation of a grid with:
     - max number of columns (this is grid columns, not "columns of content" => +1)
     - min width of column content
     https://css-tricks.com/an-auto-filling-css-grid-with-max-columns/
    */
    --item-min-width: 30rem;
    --max-columns: 3;
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
