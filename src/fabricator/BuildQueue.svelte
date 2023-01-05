<script lang="ts">
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import MenuButton from "./MenuButton.svelte";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import type { BuildOrder } from "../types";
  import { isRepeat } from "../types";
  import { buildQueue, mode, uiState } from "./store";
  import { clock } from "../time/store";
  import { Construct } from "../gameStateStore";

  let queue: BuildOrder[] = [];

  function enterEdit() {
    clock.startIndirectPause();
    uiState.enterEdit(queue);
  }
  function saveEdits() {
    clock.stopIndirectPause();
    uiState.saveEdits();
  }
  function cancelEdits() {
    clock.stopIndirectPause();
    uiState.cancelEdits();
  }
  $: {
    if ($mode === "read-only") {
      queue = $buildQueue;
    } else {
      const [first, second] = $uiState;
      if (second) {
        queue = second.present.queue;
      } else if (first.present) {
        queue = first.present.queue;
      } else {
        queue = [];
      }
    }
  }
  export let visible = true;
</script>

<section
  style="min-width: 30rem; grid-template-columns: auto 1fr auto; grid-template-rows: auto 1fr auto"
  class="grid shrink-0 flex-grow gap-1 rounded-sm border-2 p-1"
  class:visible
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
        class="my-2 px-2 border-2 border-indigo-300 text-indigo-300 hover:bg-stone-700 hover:text-indigo-300 active:bg-stone-900 active:text-indigo-300"
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
