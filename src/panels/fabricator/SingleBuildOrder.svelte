<script lang="ts">
  import type { BuildOrder } from "../../types";
  import { isRepeat, isInfinite } from "../../types";
  import { ICON } from "../../icons";

  export let buildOrder: undefined | BuildOrder;
</script>

{#if buildOrder !== undefined && isRepeat(buildOrder)}
  <ol>
    {#if isInfinite(buildOrder)}🗘 Forever{:else}{buildOrder.count}{/if}
    {#each buildOrder.repeat as bo, i ([bo, i])}
      <svelte:self buildOrder={bo} />
    {/each}
  </ol>
{:else}
  <figure class="flex flex-row flex-wrap items-center justify-between p-0.5">
    <img
      src={buildOrder === undefined ? "./empty.png" : ICON[buildOrder.building]}
      alt={buildOrder?.building ?? "Empty slot"}
      title={buildOrder?.building ?? "None"}
      class="mr-auto rounded border-2 border-slate-900"
    />
    <figcaption class="ml-auto">{buildOrder?.building ?? "None"}</figcaption>
  </figure>
{/if}
