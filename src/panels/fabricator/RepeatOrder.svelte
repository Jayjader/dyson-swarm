<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import { flip } from "svelte/animate";
  import type { Repeat } from "../../types";
  import { isInfinite, isRepeat } from "../../types";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import { BUILD_QUEUE_STORE, stackMode } from "./store";

  export let buildOrder: Repeat;
  export let position: { p: [number, ...number[]] };

  let mode;
  const uiState = getContext(BUILD_QUEUE_STORE).uiState;
  const uiSub = uiState.subscribe((stack) => {
    mode = stackMode(stack);
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
      class="w-full"
    >
      {#if mode === "add-build-select-position"}
        <button
          on:click={() =>
            uiState.enterChooseConstructForNewBuildOrder({
              before: [...position.p, i],
            })}>Insert Here</button
        >
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
    <li style="list-style: none" class="w-full">
      <button
        on:click={() =>
          uiState.enterChooseConstructForNewBuildOrder({
            before: [...position.p, buildOrder.repeat.length],
          })}>Insert Here</button
      >
    </li>
  {/if}
</ol>
