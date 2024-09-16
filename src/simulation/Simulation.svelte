<script lang="ts">
  import {
    createEventDispatcher,
    getContext,
    onDestroy,
    setContext,
  } from "svelte";
  import "../app.css";
  import {
    makeSimulationStore,
    type Simulation,
    SIMULATION_STORE,
  } from "../events";
  import { gridState } from "../events/processes/powerGrid";
  import { swarmCount } from "../events/processes/satelliteSwarm";
  import { readStored } from "../events/processes/storage";
  import { Resource } from "../gameRules";
  import ProgressOverview from "../hud/ProgressOverview.svelte";
  import ResourceHud from "../hud/ResourceHud.svelte";
  import SwarmHud from "../hud/SwarmHud.svelte";
  import TimeControl from "../hud/TimeControl.svelte";
  import PanelSelector from "../panel-control/PanelSelector.svelte";
  import { uiPanelsState } from "../panel-control/store";
  import ConstructOverview from "../panels/constructs/ConstructOverview.svelte";
  import Fabricator from "../panels/fabricator/Fabricator.svelte";
  import StorageOverview from "../panels/storage/StorageOverview.svelte";
  import RenderedView from "./3DSimulationView.svelte";
  import { SETTINGS_CONTEXT } from "../settings/store";
  import type {
    ObjectiveTracker,
    TrackedObjectives,
  } from "../objectiveTracker/store";
  import { OBJECTIVE_TRACKER_CONTEXT } from "../objectiveTracker/store";
  import Guide from "../objectiveTracker/Guide.svelte";
  import History from "../panels/history/History.svelte";
  import { type EventsQueryAdapter } from "../events/query";
  import { type EventSourcesAdapter } from "../events/eventSources";
  import { type SnapshotsAdapter } from "../events/snapshots";

  export let simulation: ReturnType<typeof makeSimulationStore>;
  export let adapters: {
    eventsReadAdapter: EventsQueryAdapter;
    eventSourcesAdapter: EventSourcesAdapter;
    snapshotsAdapter: SnapshotsAdapter;
  };
  const readStoredResource = (
    simulation: Simulation,
    resource: Resource,
  ): bigint =>
    resource === Resource.ELECTRICITY
      ? gridState(simulation).stored
      : readStored(simulation, resource);

  setContext(SIMULATION_STORE, { simulation });
  const { settings } = getContext(SETTINGS_CONTEXT);

  let resources = new Map();
  let swarm = 0;

  const unsubFromSim = simulation.subscribe((sim) => {
    swarm = swarmCount(sim);
    [
      Resource.ELECTRICITY,
      Resource.ORE,
      Resource.METAL,
      Resource.PACKAGED_SATELLITE,
    ].forEach((resource) =>
      resources.set(resource, readStoredResource(sim, resource)),
    );
    resources = resources; // trigger svelte reactivity
  });
  onDestroy(unsubFromSim);

  let clockFrame: number = 0;
  function scheduleCallback(callback: FrameRequestCallback) {
    clockFrame = window.requestAnimationFrame(callback);
  }
  function cancelCallback() {
    console.debug({ command: "cancel-callback", animationFrame: clockFrame });
    window.cancelAnimationFrame(clockFrame);
    clockFrame = 0;
  }

  function outsideClockLoop(timeStamp: DOMHighResTimeStamp) {
    if (swarm >= 2 ** 50) {
      cancelCallback();
      return window.alert(
        "You've successfully launched enough satellites into the star's orbit to capture and redirect the majority of its output!\n" +
          "Thanks for playing for so long.\n" +
          "If you feel up to the effort, I would greatly appreciate you save your game, export that save to a file, and find a way to share that file with me (I will try to update this message with an email address once I have set that up).\n" +
          "This game is not finished being developed. While there is no way to subscribe to updates (yet), a good rule of thumb is to be ready to wait several months before a new version is published.",
      );
    }
    simulation.broadcastEvent({ tag: "outside-clock-tick", timeStamp });
    simulation.processUntilSettled();
    scheduleCallback(outsideClockLoop);
  }

  onDestroy(window.cancelAnimationFrame.bind(window, clockFrame));

  const dispatchEvent = createEventDispatcher();

  export let objectives: ObjectiveTracker;
  let tracked = [],
    guideOpen = false;
  setContext(OBJECTIVE_TRACKER_CONTEXT, { objectives });
  $: {
    const { active, open }: TrackedObjectives = $objectives;
    tracked = active;
    guideOpen = open;
  }

  //scheduleCallback(outsideClockLoop);
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
      <div class="flex-basis-auto flex flex-grow-0 flex-col gap-2">
        <button
          class="min-h-max flex-grow self-stretch rounded border-2 border-slate-100 px-2 text-slate-100"
          on:click={() => dispatchEvent("open-menu")}
        >
          Menu
        </button>

        <button
          disabled={guideOpen}
          on:click={objectives.open}
          class={"max-w-min flex-grow break-normal rounded border-2 border-slate-100 px-2 " +
            (guideOpen ? "bg-slate-100 text-slate-900" : "text-slate-100")}
        >
          {#if !guideOpen}
            Open
          {/if}
          Guide
          {#if guideOpen}
            Open
          {/if}
        </button>
      </div>
      {#if tracked.length > 0}
        <ProgressOverview />
      {/if}
    </div>
  </div>

  <div class="panels grid-auto grid overflow-y-scroll" style="--gap: 0.5rem">
    {#if $uiPanelsState.has("history")}
      <History {adapters} />
    {/if}
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
  <Guide />
</main>
{#if $settings.show3dRender}
  <RenderedView />
{/if}

<style>
  main {
    height: calc(100dvh - 2.5em);
    max-height: calc(100dvh - 2.5em);
    pointer-events: none;
  }
  :global(main *) {
    z-index: 1;
    pointer-events: auto;
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
