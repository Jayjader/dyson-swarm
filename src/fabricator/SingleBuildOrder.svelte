<script lang="ts">
  import type { BuildOrder } from "../types";
  import { isRepeat, isInfinite } from "../types";
  import { ICON } from "../icons";

  export let buildOrder: undefined | BuildOrder;
</script>

<span class="inline-block flex min-w-min flex-row flex-wrap items-center">
  {#if isRepeat(buildOrder)}
    <ol>
      {#if isInfinite(buildOrder)}🗘 Forever{:else}{buildOrder.count}{/if}
      {#each buildOrder.repeat as bo, i ([bo, i])}
        <svelte:self buildOrder={bo} />
      {/each}
    </ol>
  {:else}
    <img
      src={ICON[buildOrder.building]}
      alt={buildOrder.building}
      title={buildOrder.building}
    />
    <span class="mx-auto">{buildOrder.building}</span>
  {/if}
</span>
