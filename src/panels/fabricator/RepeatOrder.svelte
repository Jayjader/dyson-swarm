<script lang="ts">
  import type { Repeat } from "../../types";
  import { isInfinite, isRepeat } from "../../types";
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import BuildQueueItem from "./BuildQueueItem.svelte";

  export let buildOrder: Repeat;
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
  {#each buildOrder.repeat as bo, i (i)}
    <BuildQueueItem isRepeat={isRepeat(bo)}>
      {#if isRepeat(bo)}
        <svelte:self buildOrder={bo} />
      {:else}
        <SingleBuildOrder buildOrder={bo} />
      {/if}
    </BuildQueueItem>
  {/each}
</ol>
