<script lang="ts">
  import type { BuildOrder, Input } from "../types";
  import { Building, isRepeat, Resource } from "../types";
  import { buildQueue, currentJob } from "../store/fabricator";
  import { constructionCosts } from "../actions";
  import Job from "./Job.svelte";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import { derived, writable } from "svelte/store";
  import MenuButton from "./MenuButton.svelte";

  type EditInTime = { queue: BuildOrder[] };
  type EditState = {
    past: Array<EditInTime>;
    present: EditInTime;
    future: Array<EditInTime>;
  };
  const uiStateStack = writable<
    | []
    | [EditState]
    | ["add-build-order", EditState]
    | ["remove-build-order", EditState]
  >([]);
  const mode = derived<
    any,
    "read-only" | "edit" | "add-build-order" | "remove-build-order"
  >(uiStateStack, (stack) => {
    const [head] = stack;
    if (!head) return "read-only";
    if (head.past) return "edit";
    if (head === "add-build-order") return "add-build-order";
    if (head === "remove-build-order") return "remove-build-order";
  });
  const uiState = {
    ...derived(uiStateStack, (stack) => stack),
    enterEdit: (queue: BuildOrder[]) => {
      uiStateStack.set([{ future: [], past: [], present: { queue } }]);
    },
    cancelEdits: () => uiStateStack.set([]),
    saveEdits: () =>
      uiStateStack.update((stack) => {
        const [head] = stack;
        if (head) buildQueue.replace(head.present.queue);
        return [];
      }),
    undoEdit: () =>
      uiStateStack.update(([first, second]) => {
        if (first?.present) {
          const future: EditInTime[] = Array.from(first.future);
          future.push(first.present);
          const past: EditInTime[] = Array.from(first.past);
          const present = past.pop();
          return [{ future, past, present }];
        } else {
          return [first, second];
        }
      }),
    redoEdit: () =>
      uiStateStack.update(([first, second]) => {
        if (first?.future) {
          const past: EditInTime[] = Array.from(first.past);
          past.push(first.present);
          const future: EditInTime[] = Array.from(first.future);
          const present = future.pop();
          return [{ future, past, present }];
        } else {
          return [first, second];
        }
      }),
    enterAddBuildOrder: () =>
      uiStateStack.update(([first, second]) =>
        first?.present ? ["add-build-order", first] : [first, second]
      ),
    cancelAddBuildOrder: () =>
      uiStateStack.update(([first, second]) =>
        first === "add-build-order" ? [second] : [first, second]
      ),
    selectNewBuildOrder: (building: Building) =>
      uiStateStack.update(([first, second]) => {
        if (first === "add-build-order") {
          const past: EditInTime[] = Array.from(second.past);
          const queue: BuildOrder[] = Array.from(second.present.queue);
          past.push(second.present);
          queue.push({ building });
          return [{ future: [], present: { queue }, past }];
        } else {
          return [first, second];
        }
      }),
    clearQueue: () =>
      uiStateStack.update(([first, second]) => {
        if (first?.present) {
          const past = Array.from<EditInTime>(first.past);
          past.push(first.present);
          return [{ future: [], present: { queue: [] }, past }];
        } else {
          return [first, second];
        }
      }),
    enterRemoveBuildOrder: () =>
      uiStateStack.update(([first, second]) =>
        first?.present ? ["remove-build-order", first] : [first, second]
      ),
    cancelRemoveBuildOrder: () =>
      uiStateStack.update(([first, second]) =>
        first === "remove-build-order" ? [second] : [first, second]
      ),
    removeBuildOrder: (index: number) =>
      uiStateStack.update(([first, second]) => {
        if (first === "remove-build-order") {
          const past = Array.from<EditInTime>(second.past);
          const queue = Array.from<BuildOrder>(second.present.queue);
          past.push(second.present);
          console.debug({ splice: { queue, index } });
          queue.splice(index, 1);
          return [{ future: [], past, present: { queue } }];
        } else {
          return [first, second];
        }
      }),
  };

  let queue: BuildOrder[] = [];
  let costs: null | Input = null;
  currentJob.subscribe((job) => {
    costs = job === undefined ? null : constructionCosts[job.building];
  });

  export let resources;
  $: {
    if ($mode === "read-only") {
      queue = $buildQueue;
    } else {
      const [first, second] = $uiState;
      console.debug({ uiStack: { first, second } });
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

<section style="grid-area: BuildQueue">
  <h2>Fabricator</h2>
  <h3>Current Job</h3>
  {#if $currentJob !== undefined}
    <button on:click={() => currentJob.set(undefined)}>Clear Job</button>
  {/if}
  <Job
    matsCurrent={costs
      ? [...costs].reduce(
          (accu, [resource, cost]) =>
            resource === Resource.ELECTRICITY
              ? accu
              : accu + Math.min(cost, resources?.[resource] ?? 0),
          0
        )
      : 1}
    matsTotal={costs
      ? [...costs].reduce(
          (accu, [resource, cost]) =>
            resource === Resource.ELECTRICITY ? accu : accu + cost,
          0
        )
      : 1}
    elecCurrent={resources[Resource.ELECTRICITY]}
    elecTotal={costs ? costs.get(Resource.ELECTRICITY) : 1}
  />
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
          class="text-indigo-400 border-2 border-indigo-400 -my-0.5 hover:bg-stone-700 active:bg-stone-900 hover:text-indigo-300 active:text-indigo-300"
          on:click={() => {
            uiState.enterEdit(queue);
          }}
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
        <li
          class="border-2 rounded-sm"
          class:border-sky-500={!isRepeat(buildOrder)}
          class:border-pink-400={isRepeat(buildOrder)}
          class:border-rose-500={$mode === "remove-build-order"}
          class:hover:border-rose-600={$mode === "remove-build-order"}
          class:active:border-rose-600={$mode === "remove-build-order"}
        >
          {#if $mode === "remove-build-order" && !isRepeat(buildOrder)}
            <button
              style="width: 100%"
              class="hover:bg-rose-800"
              on:click={uiState.removeBuildOrder.bind(this, i)}
            >
              <BuildQueueItem {buildOrder} />
            </button>
          {:else}
            <BuildQueueItem {buildOrder} />
          {/if}
        </li>
      {/each}
    </ol>
    {#if $mode === "edit"}
      <div class="flex flex-col gap-0.5 col-start-1 row-span-2">
        <MenuButton
          text="Remove Build Order"
          on:click={uiState.enterRemoveBuildOrder}
        />
        <MenuButton text="Remove Repeat" />
        <MenuButton text="Clear Queue" on:click={uiState.clearQueue} />
      </div>
      <div class="flex flex-col gap-0.5 col-start-3 row-span-2">
        <MenuButton
          text="Add Build Order"
          on:click={uiState.enterAddBuildOrder}
        />
        <MenuButton text="Add Repeat" />
      </div>
      <div class="flex flex-row gap-0.5 justify-between col-start-1 col-span-3">
        <MenuButton text="Cancel Edits" on:click={uiState.cancelEdits} />
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
        <MenuButton text="Save Edits" on:click={uiState.saveEdits} />
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
</section>
