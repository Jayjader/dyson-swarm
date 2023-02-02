<script lang="ts">
  import { getContext, onDestroy, setContext } from "svelte";
  import { scale } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { SIMULATION_STORE } from "../../events";
  import { getClock } from "../../events/processes/clock";
  import { getFabricator } from "../../events/processes/fabricator";
  import { Construct } from "../../gameRules";
  import { getPrimitive } from "../../hud/types";
  import type { BuildOrder, Repeat } from "../../types";
  import { isRepeat } from "../../types";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import MenuButton from "./MenuButton.svelte";
  import RepeatOrder from "./RepeatOrder.svelte";
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import {
    areSamePosition,
    BUILD_QUEUE_STORE,
    clone,
    makeBuildQueueUiStore,
    queryAt,
    stackMode,
  } from "./store";

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
  let edited, previousFiniteValue, insertionPoint;
  const unsubUi = uiState.subscribe((stack) => {
    mode = stackMode(stack);
    showProcessorQueue = mode === "read-only";
    uiQueue = clone(stack.at(mode === "edit" ? 0 : 1)?.present.queue ?? []);
    insertionPoint =
      mode !== "add-build-select-construct" ? undefined : stack[0].before;
    edited =
      mode !== "add-repeat-confirm"
        ? undefined
        : {
            position: stack[0].initial,
            repeatCount: (
              queryAt(stack[0].initial, stack[1].present.queue) as Repeat
            ).count,
          };
  });
  function setRepeatCount(newCount: number) {
    if (!Number.isFinite(newCount)) {
      previousFiniteValue = edited.repeatCount;
    }
    uiState.changeRepeatCount(edited.position, newCount);
  }
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
  class:border-indigo-400={mode.startsWith("add-build")}
  class:border-rose-600={mode === "remove-build-order"}
>
  <div class="col-start-2 row-start-1 flex flex-row justify-evenly ">
    <h3
      class="max-w-min break-normal font-bold"
      class:text-sky-500={mode === "read-only"}
      class:text-violet-400={mode === "edit"}
      class:text-indigo-400={mode.startsWith("add-build")}
      class:text-rose-600={mode === "remove-build-order" ||
        mode === "remove-repeat-order"}
    >
      {#if mode === "read-only"}
        Order Queue
      {:else if mode === "edit"}
        Edit
      {:else if mode === "add-build-select-position"}
        Select Position
      {:else if mode === "add-build-select-construct"}
        Select Construct
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
      <li animate:flip={{ duration: 200 }} class="w-full list-none">
        {#if mode === "add-build-select-position"}
          <button
            class="mb-1 w-full rounded-md border-2 border-slate-100 bg-slate-100 text-center text-slate-800 hover:bg-slate-300"
            in:scale={{ duration: 100 }}
            on:click={() =>
              uiState.enterChooseConstructForNewBuildOrder({ before: [i] })}
            >Insert Here</button
          >
        {:else if mode === "add-build-select-construct" && areSamePosition([i], insertionPoint)}
          <div
            class="mb-1 w-full rounded-md border-2 border-slate-100 bg-slate-100 text-center text-slate-800"
          >
            Will Be Inserted Here
          </div>
        {/if}
        <BuildQueueItem
          position={{ p: [i] }}
          repeat={isRepeat(buildOrder) ? buildOrder.count : undefined}
        >
          {#if isRepeat(buildOrder)}
            <RepeatOrder position={{ p: [i] }} {buildOrder} />
          {:else}
            <SingleBuildOrder {buildOrder} />
          {/if}
        </BuildQueueItem>
      </li>
    {/each}
    {#if mode === "add-build-select-position"}
      <li class="w-full list-none">
        <button
          class="w-full rounded-md border-2 border-slate-100 bg-slate-100 text-center text-slate-800 hover:bg-slate-300"
          in:scale={{ duration: 100 }}
          on:click={() =>
            uiState.enterChooseConstructForNewBuildOrder({
              before: [queue.length],
            })}>Insert Here</button
        >
      </li>
    {:else if mode === "add-build-select-construct" && areSamePosition([queue.length], insertionPoint)}
      <li
        class="w-full rounded-md border-2 border-slate-100 bg-slate-100 text-center text-slate-800"
      >
        Will Be Inserted Here
      </li>
    {/if}
  </ol>
  {#if mode === "edit"}
    <div class="col-start-1 row-span-2 flex flex-col gap-0.5">
      <MenuButton
        text="Remove Build Order"
        on:click={uiState.enterRemoveBuildOrder}
        disabled={$uiState?.[0]?.present?.queue?.length === 0}
      />
      <MenuButton
        text="Remove Repeat"
        on:click={uiState.enterRemoveRepeatOrder}
        disabled={!($uiState?.[0]?.present?.queue ?? []).some((buildOrder) =>
          isRepeat(buildOrder)
        )}
      />
      <MenuButton
        text="Unwrap Repeat"
        on:click={uiState.enterUnwrapRepeatOrder}
        disabled={!($uiState?.[0]?.present?.queue ?? []).some((buildOrder) =>
          isRepeat(buildOrder)
        )}
      />
      <MenuButton
        text="Clear Queue"
        on:click={uiState.clearQueue}
        disabled={!$uiState?.[0]?.present?.queue?.length}
      />
    </div>
    <div class="col-start-3 row-span-2 flex flex-col items-end gap-0.5">
      <MenuButton
        text="Add Build Order"
        on:click={() =>
          $uiState[0]?.present.queue.length === 0
            ? uiState.enterChooseConstructForNewBuildOrder({ before: [0] })
            : uiState.enterAddBuildOrder()}
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
  {:else if mode === "add-build-select-construct"}
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
    {#if mode === "add-repeat-confirm"}
      <div class="col-start-3 row-span-2 flex flex-col items-end gap-0.5">
        <div
          class="flex flex-col gap-1 break-normal rounded-sm border-2 border-indigo-300 px-1 text-indigo-300"
        >
          <label class="flex flex-col gap-1"
            >Count
            {#if Number.isFinite(edited.repeatCount)}
              <input
                style="width: 8ch"
                class="bg-stone-800 text-right"
                type="number"
                min="2"
                value={edited.repeatCount}
                on:change={(e) => setRepeatCount(parseInt(e.target.value, 10))}
              />
            {:else}
              <!-- infinity sign in unicode -->
              <input
                style="width: 8ch"
                class="bg-stone-800 text-center"
                value="&#8734;"
                disabled
              />
            {/if}
          </label>
          <label class="flex gap-1"
            ><input
              type="checkbox"
              checked={!Number.isFinite(edited.repeatCount)}
              disabled={edited.position.length > 1}
              on:change={() =>
                setRepeatCount(
                  Number.isFinite(edited.repeatCount)
                    ? Infinity
                    : previousFiniteValue
                )}
            />Forever</label
          >
        </div>
      </div>
    {/if}
    <div
      class="col-span-3 col-start-1 row-start-3 flex flex-row justify-between gap-0.5"
    >
      <MenuButton text="Cancel" on:click={uiState.cancelAddRepeat} />
      <MenuButton
        text="Change Choice"
        on:click={uiState.changeSelection}
        disabled={mode === "add-repeat-select-initial"}
      />
      <MenuButton
        text="Confirm"
        on:click={() => uiState.confirmAddRepeat(edited.repeatCount)}
        disabled={mode !== "add-repeat-confirm"}
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
