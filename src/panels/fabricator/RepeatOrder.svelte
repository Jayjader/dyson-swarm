<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import { scale } from "svelte/transition";
  import { flip } from "svelte/animate";
  import type { Repeat } from "../../types";
  import { isInfinite, isRepeat } from "../../types";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import { areSamePosition, BUILD_QUEUE_STORE, stackMode } from "./store";

  export let buildOrder: Repeat;
  export let position: { p: [number, ...number[]] };

  let mode, insertionPoint;
  const uiState = getContext(BUILD_QUEUE_STORE).uiState;
  const uiSub = uiState.subscribe((stack) => {
    mode = stackMode(stack);
    insertionPoint =
      mode !== "add-build-select-construct" ? undefined : stack[0].before;
  });
  onDestroy(uiSub);
</script>

<span
  class="rounded-br border-b-2 border-r-2 border-violet-300 p-1 text-violet-100"
>
  {#if isInfinite(buildOrder)}
    🗘 (Forever)
  {:else}
    {buildOrder.count}×
  {/if}
</span>
<ol class="flex flex-col items-center gap-1 self-stretch px-1 pb-1">
  {#each buildOrder.repeat as bo, i (bo)}
    <li
      animate:flip={{ duration: 200 }}
      style="list-style: none"
      class="w-full list-none"
    >
      {#if mode === "add-build-select-position"}
        <button
          class="mb-1 w-full rounded-md border-2 border-slate-100 bg-slate-100 text-center text-slate-800 hover:bg-slate-300"
          in:scale={{ duration: 100 }}
          on:click={() =>
            uiState.enterChooseConstructForNewBuildOrder({
              before: [...position.p, i],
            })}>Insert Here</button
        >
      {:else if mode === "add-build-select-construct" && areSamePosition([...position.p, i], insertionPoint)}
        <div
          class="w-full rounded-md border-2 border-slate-100 bg-slate-100 text-center text-slate-800"
        >
          Will Be Inserted Here
        </div>
      {/if}
      <BuildQueueItem
        position={{ p: [...position.p, i] }}
        repeat={isRepeat(bo) ? bo.count : undefined}
      >
        {#if isRepeat(bo)}
          <svelte:self position={{ p: [...position.p, i] }} buildOrder={bo} />
        {:else}
          <SingleBuildOrder buildOrder={bo} />
        {/if}
      </BuildQueueItem>
    </li>
  {/each}
  {#if mode === "add-build-select-position"}
    <li class="w-full list-none">
      <button
        class="mb-1 w-full rounded-md border-2 border-slate-100 bg-slate-100 text-center text-slate-800 hover:bg-slate-300"
        in:scale={{ duration: 100 }}
        on:click={() =>
          uiState.enterChooseConstructForNewBuildOrder({
            before: [...position.p, buildOrder.repeat.length],
          })}>Insert Here</button
      >
    </li>
  {:else if mode === "add-build-select-construct" && areSamePosition([...position.p, buildOrder.repeat.length], insertionPoint)}
    <div
      class="mb-1 w-full rounded-md border-2 border-slate-100 bg-slate-100 text-center text-slate-800"
    >
      Will Be Inserted Here
    </div>
  {/if}
</ol>
