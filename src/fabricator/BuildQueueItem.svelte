<script lang="ts">
  import type { BuildOrder } from "../types";
  import { isRepeat, isInfinite } from "../types";

  export let buildOrder: undefined | BuildOrder;
</script>

<span class="text-slate-100 min-w-min inline-block">
  {#if isRepeat(buildOrder)}
    <ol>
      {#if isInfinite(buildOrder)}🗘 Forever{:else}{buildOrder.count}{/if}
      {#each buildOrder.repeat as bo, i ([bo, i])}
        <svelte:self buildOrder={bo} />
      {/each}
    </ol>
  {:else}
    <img src="http://via.placeholder.com/24.png" alt={buildOrder.building} />
    {buildOrder.building}
  {/if}
</span>
