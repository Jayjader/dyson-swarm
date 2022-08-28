<script lang="ts">
  import type { BuildOrder, Input } from "../types";
  import { Building, isRepeat, Resource } from "../types";
  import { buildQueue, currentJob } from "../store/fabricator";
  import { constructionCosts } from "../actions";
  import Job from "./Job.svelte";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import { derived, writable } from "svelte/store";
  import MenuButton from "./MenuButton.svelte";

  type PastEdit = { queue: BuildOrder[] };
  type BaseEdit = { history: [PastEdit, ...PastEdit[]] };
  const uiStateStack = writable<
    [] | [BaseEdit] | ["add-build-order", BaseEdit]
  >([]);
  const mode = derived<any, "read-only" | "edit" | "add-build-order">(
    uiStateStack,
    (stack) => {
      const [head] = stack;
      if (!head) return "read-only";
      if (head.history) return "edit";
      if (head === "add-build-order") return "add-build-order";
    }
  );
  const uiState = {
    ...derived(uiStateStack, (stack) => stack),
    enterEdit: (queue: BuildOrder[]) => {
      uiStateStack.set([{ history: [{ queue }] }]);
    },
    cancelEdits: () => uiStateStack.set([]),
    saveEdits: () =>
      uiStateStack.update((stack) => {
        const [head] = stack;
        if (head) buildQueue.replace(head.history[0].queue);
        return [];
      }),
    enterAddBuildOrder: () =>
      uiStateStack.update(([first, second]) =>
        first?.history ? ["add-build-order", first] : [first, second]
      ),
    selectNewBuildOrder: (building: Building) =>
      uiStateStack.update(([first, second]) =>
        first === "add-build-order"
          ? [
              {
                history: [
                  { queue: [{ building }, ...second.history[0].queue] },
                  ...second.history,
                ],
              },
            ]
          : [first, second]
      ),
  };

  let queue: BuildOrder[] = [];
  let costs: null | Input = null;
  buildQueue.subscribe((value) => {
    queue = value;
  });
  currentJob.subscribe((job) => {
    costs = job === undefined ? null : constructionCosts[job.building];
  });

  export let resources;
  $: {
    if ($mode === "read-only") {
      queue = $buildQueue;
    } else {
      const [first, second] = $uiState;
      if (second) {
        queue = second.history[0].queue;
      } else {
        queue = first.history[0].queue;
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
  >
    {#if $mode === "edit"}
      <div class="flex flex-col gap-0.5 col-start-1 row-span-2">
        <MenuButton text="Remove Build Order" />
        <MenuButton text="Remove Repeat" />
        <MenuButton text="Clear Queue" />
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
          <MenuButton text="Undo" />
          <MenuButton text="Redo" />
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
        <MenuButton text="Miner" />
        <MenuButton text="Refiner" />
      </div>
      <div class="flex flex-col gap-0.5 col-start-3 row-span-2">
        <MenuButton text="Satellite Launcher" />
        <MenuButton text="Satellite Factory" />
      </div>
    {/if}
    <h3
      class="text-indigo-400 font-bold flex flex-row justify-evenly row-start-1 col-start-2"
      class:text-sky-500={$mode === "read-only"}
      class:text-violet-400={$mode === "edit"}
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
      {:else}Edit{/if}
    </h3>
    {#if queue.length > Number.POSITIVE_INFINITY}
      <button on:click={() => buildQueue.clear({ onlyAuto: true })}
        >Clear Repeat</button
      >
      <button on:click={() => buildQueue.clear()}>Clear Queue</button>
    {/if}
    <ol class="mx-1 col-start-2 row-start-2">
      {#each queue as buildOrder, i (buildOrder)}
        <li
          class="border-2 rounded-sm"
          class:border-sky-500={!isRepeat(buildOrder)}
          class:border-pink-400={isRepeat(buildOrder)}
        >
          <BuildQueueItem {buildOrder} />
        </li>
      {/each}
    </ol>
  </section>
</section>
