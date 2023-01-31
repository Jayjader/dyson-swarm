<script lang="ts">
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import MenuButton from "./MenuButton.svelte";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import type { BuildOrder } from "../../types";
  import { isRepeat } from "../../types";
  import {
    BUILD_QUEUE_STORE,
    clone,
    makeBuildQueueUiStore,
    stackMode,
  } from "./store";
  import { Construct } from "../../gameRules";
  import { getContext, onDestroy, setContext } from "svelte";
  import { SIMULATION_STORE } from "../../events";
  import { getFabricator } from "../../events/processes/fabricator";
  import { getClock } from "../../events/processes/clock";
  import { getPrimitive } from "../../hud/types";
  import RepeatOrder from "./RepeatOrder.svelte";

  const simulation = getContext(SIMULATION_STORE).simulation;

  let savedQueue: BuildOrder[] = [];
  let uiQueue: BuildOrder[] = [];
  let tick = 0;
  let showProcessorQueue = true;

  const unsubSim = simulation.subscribe((sim) => {
    savedQueue = getFabricator(sim).queue;
    tick = getPrimitive(getClock(sim)).tick;
  });
  const uiState = makeBuildQueueUiStore();

  setContext(BUILD_QUEUE_STORE, { uiState });
  let mode;
  const unsubUi = uiState.subscribe((stack) => {
    mode = stackMode(stack);
    showProcessorQueue = mode === "read-only";
    uiQueue = clone(stack.at(Boolean(mode !== "edit"))?.present.queue ?? []);
  });
  $: queue = showProcessorQueue ? savedQueue : uiQueue;
  function enterEdit() {
    const busEvent = {
      tag: "command-simulation-clock-indirect-pause",
      afterTick: tick,
      timeStamp: performance.now(),
    } as const;
    console.info(busEvent);
    simulation.broadcastEvent(busEvent);
    uiState.enterEdit(queue);
  }
  function saveEdits() {
    const newQueue: BuildOrder[] = uiState.saveEdits();
    const timeStamp = performance.now();
    const busEvent = {
      tag: "command-set-fabricator-queue",
      queue: newQueue,
      afterTick: tick,
      timeStamp,
    } as const;
    console.info(busEvent);
    simulation.broadcastEvent(busEvent);
    // consider: merge into previous event by adding set-queue to clock's subscriptions?
    const busEvent_following = {
      tag: "command-simulation-clock-indirect-resume",
      afterTick: tick,
      timeStamp,
    } as const;
    console.info(busEvent_following);
    simulation.broadcastEvent(busEvent_following);
  }
  function cancelEdits() {
    const busEvent = {
      tag: "command-simulation-clock-indirect-resume",
      afterTick: tick,
      timeStamp: performance.now(),
    } as const;
    console.info(busEvent);
    simulation.broadcastEvent(busEvent);
    uiState.cancelEdits();
  }
  onDestroy(unsubSim);
  onDestroy(unsubUi);
</script>

<section
  style="grid-template-columns: auto minmax(8rem, 1fr) auto; grid-template-rows: auto 1fr auto"
  class="grid shrink-0 flex-grow gap-1 rounded-sm border-2 p-1"
  class:border-sky-500={mode === "read-only"}
  class:border-violet-400={mode === "edit"}
  class:border-indigo-400={mode === "add-build-order"}
  class:border-rose-600={mode === "remove-build-order"}
>
  <div class="col-start-2 row-start-1 flex flex-row justify-evenly ">
    <h3
      class="max-w-min break-normal font-bold"
      class:text-sky-500={mode === "read-only"}
      class:text-violet-400={mode === "edit"}
      class:text-indigo-400={mode === "add-build-order"}
      class:text-rose-600={mode === "remove-build-order" ||
        mode === "remove-repeat-order"}
    >
      {#if mode === "read-only"}
        Order Queue
      {:else if mode === "edit"}
        Edit
      {:else if mode === "add-build-order"}
        Add Build Order
      {:else if mode === "add-repeat-select-initial"}
        Select Initial Boundary
      {:else if mode === "add-repeat-select-final"}
        Select Final Boundary
      {:else if mode === "add-repeat-confirm"}
        Confirm
      {:else if mode === "remove-build-order"}
        Remove Build Order
      {:else if mode === "remove-repeat-order"}
        Remove Repeat Order
      {/if}
    </h3>
    {#if mode === "read-only"}
      <button
        class="my-2 rounded border-2 border-indigo-300 px-2 text-indigo-300 hover:bg-stone-700 hover:text-indigo-300 active:bg-stone-900 active:text-indigo-300"
        on:click={enterEdit}
      >
        Edit
      </button>
    {/if}
  </div>
  <ol
    class="col-start-2 row-start-2 mx-1 flex flex-col items-center gap-1 px-1"
  >
    {#each queue as buildOrder, i (buildOrder)}
      <BuildQueueItem position={[i]} isRepeat={isRepeat(buildOrder)}>
        {#if isRepeat(buildOrder)}
          <RepeatOrder position={[i]} {buildOrder} />
        {:else}
          <SingleBuildOrder {buildOrder} />
        {/if}
      </BuildQueueItem>
    {/each}
  </ol>
  {#if mode === "edit"}
    <div class="col-start-1 row-span-2 flex flex-col gap-0.5">
      <MenuButton
        text="Remove Build Order"
        on:click={uiState.enterRemoveBuildOrder}
        disabled={$uiState === [] || $uiState[0]?.present?.queue?.length === 0}
      />
      <MenuButton
        text="Remove Repeat"
        on:click={uiState.enterRemoveRepeatOrder}
        disabled={$uiState === [] ||
          !$uiState[0]?.present?.queue?.some((buildOrder) =>
            isRepeat(buildOrder)
          )}
        title={$uiState === [] ||
        !$uiState[0]?.present?.queue?.some((buildOrder) => isRepeat(buildOrder))
          ? "No repeat orders to remove"
          : undefined}
      />
      <MenuButton
        text="Unwrap Repeat"
        on:click={uiState.enterUnwrapRepeatOrder}
        disabled={$uiState.length === 0 ||
          !$uiState[0]?.present?.queue?.some((buildOrder) =>
            isRepeat(buildOrder)
          )}
      />
      <MenuButton
        text="Clear Queue"
        on:click={uiState.clearQueue}
        disabled={$uiState?.[0]?.present?.queue?.length === 0}
      />
    </div>
    <div class="col-start-3 row-span-2 flex flex-col items-end gap-0.5">
      <MenuButton
        text="Add Build Order"
        on:click={uiState.enterAddBuildOrder}
      />
      <MenuButton
        text="Add Repeat"
        disabled={$uiState.length === 0 ||
          $uiState[0]?.present?.queue?.length === 0}
        on:click={uiState.enterAddRepeatOrder}
      />
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
  {:else if mode === "add-build-order"}
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
    <div class="col-start-3 row-span-2 flex flex-col items-end gap-0.5">
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
  {:else if mode.startsWith("add-repeat")}
    <div
      class="col-span-3 col-start-1 row-start-3 flex flex-row justify-between gap-0.5"
    >
      <MenuButton text="Cancel" on:click={uiState.cancelAddRepeat} />
      <MenuButton
        text="Change Choice"
        on:click={uiState.changeSelection}
        disabled={mode === "add-repeat-select-initial"}
      />
    </div>
  {:else if mode === "remove-build-order"}
    <div class="col-span-3 col-start-1 flex flex-row gap-0.5">
      <MenuButton text="Cancel" on:click={uiState.cancelRemoveBuildOrder} />
    </div>
  {:else if mode === "remove-repeat-order"}
    <div class="col-span-3 col-start-1 flex flex-row gap-0.5">
      <MenuButton text="Cancel" on:click={uiState.cancelRemoveRepeatOrder} />
    </div>
  {:else if mode === "unwrap-repeat-order"}
    <div class="col-span-3 col-start-1 flex flex-row gap-0.5">
      <MenuButton text="Cancel" on:click={uiState.cancelUnwrapRepeatOrder} />
    </div>
  {/if}
</section>
