<script lang="ts">
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import MenuButton from "./MenuButton.svelte";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import type { BuildOrder } from "../types";
  import { isRepeat } from "../types";
  import { mode, uiState } from "./store";
  import { Construct } from "../gameStateStore";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../events";
  import { getFabricator } from "../events/processes/fabricator";
  import { getClock } from "../events/processes/clock";
  import { getPrimitive } from "../time/types";

  const simulation = getContext(SIMULATION_STORE).simulation;

  let savedQueue: BuildOrder[] = [];
  let uiQueue: BuildOrder[] = [];
  let tick = 0;
  let showProcessorQueue = true;

  const unsubSim = simulation.subscribe((sim) => {
    savedQueue = getFabricator(sim).queue;
    tick = getPrimitive(getClock(sim)).tick;
  });
  const unsubUi = uiState.subscribe(([first, ...tail]) => {
    if (!first) {
      showProcessorQueue = true;
      uiQueue = [];
    } else {
      showProcessorQueue = false;
      const [second] = tail;
      if (second) {
        uiQueue = second.present.queue;
      } else if (first.present) {
        uiQueue = first.present.queue;
      } else {
        uiQueue = [];
      }
    }
  });
  $: queue = showProcessorQueue ? savedQueue : uiQueue;
  function enterEdit() {
    simulation.broadcastEvent({
      tag: "command-simulation-clock-indirect-pause",
      afterTick: tick,
      timeStamp: performance.now(),
    });
    uiState.enterEdit(queue);
  }
  function saveEdits() {
    const newQueue: BuildOrder[] = uiState.saveEdits();
    const timeStamp = performance.now();
    simulation.broadcastEvent({
      tag: "command-set-fabricator-queue",
      queue: newQueue,
      afterTick: tick,
      timeStamp,
    });
    // todo: merge into previous event by adding set-queue to clock's subscriptions?
    simulation.broadcastEvent({
      tag: "command-simulation-clock-indirect-resume",
      afterTick: tick,
      timeStamp,
    });
  }
  function cancelEdits() {
    simulation.broadcastEvent({
      tag: "command-simulation-clock-indirect-resume",
      afterTick: tick,
      timeStamp: performance.now(),
    });
    uiState.cancelEdits();
  }
  onDestroy(unsubSim);
  onDestroy(unsubUi);
</script>

<section
  style="min-width: 30rem; grid-template-columns: auto 1fr auto; grid-template-rows: auto 1fr auto"
  class="grid shrink-0 flex-grow gap-1 rounded-sm border-2 p-1"
  class:border-sky-500={$mode === "read-only"}
  class:border-violet-400={$mode === "edit"}
  class:border-indigo-400={$mode === "add-build-order"}
  class:border-rose-600={$mode === "remove-build-order"}
>
  <div class="col-start-2 row-start-1 flex flex-row justify-evenly ">
    <h3
      class="font-bold"
      class:text-sky-500={$mode === "read-only"}
      class:text-violet-400={$mode === "edit"}
      class:text-indigo-400={$mode === "add-build-order"}
      class:text-rose-600={$mode === "remove-build-order"}
    >
      {#if $mode === "read-only"}
        Order Queue
      {:else if $mode === "edit"}
        Edit
      {:else if $mode === "add-build-order"}
        Add Build Order
      {:else if $mode === "remove-build-order"}
        Remove Build Order
      {/if}
    </h3>
    {#if $mode === "read-only"}
      <button
        class="my-2 border-2 border-indigo-300 px-2 text-indigo-300 hover:bg-stone-700 hover:text-indigo-300 active:bg-stone-900 active:text-indigo-300"
        on:click={enterEdit}
      >
        Edit
      </button>
    {/if}
  </div>
  <ol class="col-start-2 row-start-2 mx-1 flex flex-col gap-1">
    {#each queue as buildOrder, i (buildOrder)}
      <BuildQueueItem mode={$mode} isRepeat={isRepeat(buildOrder)}>
        {#if $mode === "remove-build-order" && !isRepeat(buildOrder)}
          <button
            style="width: 100%"
            class="hover:bg-rose-800"
            on:click={uiState.removeBuildOrder.bind(this, i)}
          >
            <SingleBuildOrder {buildOrder} />
          </button>
        {:else}
          <SingleBuildOrder {buildOrder} />
        {/if}
      </BuildQueueItem>
    {/each}
  </ol>
  {#if $mode === "edit"}
    <div class="col-start-1 row-span-2 flex flex-col gap-0.5">
      <MenuButton
        text="Remove Build Order"
        on:click={uiState.enterRemoveBuildOrder}
        disabled={$uiState === [] || $uiState[0]?.present?.queue?.length === 0}
      />
      <MenuButton text="Remove Repeat" disabled={true} />
      <MenuButton
        text="Clear Queue"
        on:click={uiState.clearQueue}
        disabled={$uiState?.[0]?.present?.queue?.length === 0}
      />
    </div>
    <div class="col-start-3 row-span-2 flex flex-col gap-0.5">
      <MenuButton
        text="Add Build Order"
        on:click={uiState.enterAddBuildOrder}
      />
      <MenuButton text="Add Repeat" disabled={true} />
    </div>
    <div class="col-span-3 col-start-1 flex flex-row justify-between gap-0.5">
      <MenuButton text="Cancel Edits" on:click={cancelEdits} />
      <div class="flex flex-row justify-center gap-0.5">
        <MenuButton
          text="Undo"
          on:click={uiState.undoEdit}
          disabled={$uiState?.[0]?.past.length === 0}
        />
        <MenuButton
          text="Redo"
          on:click={uiState.redoEdit}
          disabled={$uiState?.[0]?.future.length === 0}
        />
      </div>
      <MenuButton
        text="Save Edits"
        on:click={saveEdits}
        disabled={$uiState?.[0]?.past?.length === 0}
      />
    </div>
  {:else if $mode === "add-build-order"}
    <div class="col-start-1 row-span-2 flex flex-col gap-0.5">
      <MenuButton
        text="Solar Collector"
        on:click={uiState.selectNewBuildOrder.bind(
          this,
          Construct.SOLAR_COLLECTOR
        )}
      />
      <MenuButton
        text="Miner"
        on:click={uiState.selectNewBuildOrder.bind(this, Construct.MINER)}
      />
      <MenuButton
        text="Refiner"
        on:click={uiState.selectNewBuildOrder.bind(this, Construct.REFINER)}
      />
    </div>
    <div class="col-start-3 row-span-2 flex flex-col gap-0.5">
      <MenuButton
        text="Satellite Launcher"
        on:click={uiState.selectNewBuildOrder.bind(
          this,
          Construct.SATELLITE_LAUNCHER
        )}
      />
      <MenuButton
        text="Satellite Factory"
        on:click={uiState.selectNewBuildOrder.bind(
          this,
          Construct.SATELLITE_FACTORY
        )}
      />
    </div>
    <div class="col-span-3 col-start-1 row-start-3 flex flex-row gap-0.5">
      <MenuButton text="Cancel" on:click={uiState.cancelAddBuildOrder} />
    </div>
  {:else if $mode === "remove-build-order"}
    <div class="col-span-3 col-start-1 flex flex-row gap-0.5">
      <MenuButton text="Cancel" on:click={uiState.cancelRemoveBuildOrder} />
    </div>
  {/if}
</section>
