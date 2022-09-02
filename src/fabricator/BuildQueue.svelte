<script lang="ts">
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import MenuButton from "./MenuButton.svelte";
  import type { BuildOrder } from "../types";
  import { buildQueue, mode, uiState } from "./store";
  import { Building, isRepeat } from "../types";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  let queue: BuildOrder[] = [];

  function enterEdit() {
    dispatch("enterEdit");
    uiState.enterEdit(queue);
  }
  function saveEdits() {
    dispatch("saveEdits");
    uiState.saveEdits();
  }
  function cancelEdits() {
    dispatch("cancelEdits");
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
</script>

<section
  style="grid-template-columns: auto 1fr auto; grid-template-rows: auto 1fr auto"
  class="border-2 rounded-sm grid gap-1 p-1"
  class:border-sky-500={$mode === "read-only"}
  class:border-violet-400={$mode === "edit"}
  class:border-indigo-400={$mode === "add-build-order"}
  class:border-rose-600={$mode === "remove-build-order"}
>
  <h3
    class="font-bold flex flex-row justify-evenly row-start-1 col-start-2"
    class:text-sky-500={$mode === "read-only"}
    class:text-violet-400={$mode === "edit"}
    class:text-indigo-400={$mode === "add-build-order"}
    class:text-rose-600={$mode === "remove-build-order"}
  >
    {#if $mode === "read-only"}
      Order Queue
      <button
        class="text-indigo-300 border-2 border-indigo-300 -my-0.5 hover:bg-stone-700 active:bg-stone-900 hover:text-indigo-300 active:text-indigo-300"
        on:click={enterEdit}
      >
        Edit
      </button>
    {:else if $mode === "edit"}
      Edit
    {:else if $mode === "add-build-order"}
      Add Build Order
    {:else if $mode === "remove-build-order"}
      Remove Build Order
    {/if}
  </h3>
  <ol class="mx-1 col-start-2 row-start-2 flex flex-col gap-1">
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
    <div class="flex flex-col gap-0.5 col-start-1 row-span-2">
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
    <div class="flex flex-col gap-0.5 col-start-3 row-span-2">
      <MenuButton
        text="Add Build Order"
        on:click={uiState.enterAddBuildOrder}
      />
      <MenuButton text="Add Repeat" disabled={true} />
    </div>
    <div class="flex flex-row gap-0.5 justify-between col-start-1 col-span-3">
      <MenuButton text="Cancel Edits" on:click={cancelEdits} />
      <div class="flex flex-row gap-0.5 justify-center">
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
    <div class="flex flex-col gap-0.5 col-start-1 row-span-2">
      <MenuButton
        text="Solar Collector"
        on:click={uiState.selectNewBuildOrder.bind(
          this,
          Building.SOLAR_COLLECTOR
        )}
      />
      <MenuButton
        text="Miner"
        on:click={uiState.selectNewBuildOrder.bind(this, Building.MINER)}
      />
      <MenuButton
        text="Refiner"
        on:click={uiState.selectNewBuildOrder.bind(this, Building.REFINERY)}
      />
    </div>
    <div class="flex flex-col gap-0.5 col-start-3 row-span-2">
      <MenuButton
        text="Satellite Launcher"
        on:click={uiState.selectNewBuildOrder.bind(
          this,
          Building.SATELLITE_LAUNCHER
        )}
      />
      <MenuButton
        text="Satellite Factory"
        on:click={uiState.selectNewBuildOrder.bind(
          this,
          Building.SATELLITE_FACTORY
        )}
      />
    </div>
    <div class="flex flex-row gap-0.5 col-start-1 row-start-3 col-span-3">
      <MenuButton text="Cancel" on:click={uiState.cancelAddBuildOrder} />
    </div>
  {:else if $mode === "remove-build-order"}
    <div class="flex flex-row gap-0.5 col-start-1 col-span-3">
      <MenuButton text="Cancel" on:click={uiState.cancelRemoveBuildOrder} />
    </div>
  {/if}
</section>
