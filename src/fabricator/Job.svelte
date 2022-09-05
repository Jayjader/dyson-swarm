<script lang="ts">
  import type { BuildOrder } from "../types";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import BuildQueueItem from "./SingleBuildOrder.svelte";
  import { currentJob } from "./store";

  const matsProgress = tweened<number>(0, {
    duration: 150,
    easing: cubicOut,
  });
  const elecProgress = tweened<number>(1, {
    duration: 150,
    easing: cubicOut,
  });
  export let matsTotal = 1;
  export let matsCurrent = 0;
  export let elecTotal = 1;
  export let elecCurrent = 1;
  let buildOrder: undefined | BuildOrder;
  $: {
    buildOrder = $currentJob;
    if (buildOrder) {
      console.debug({ command: "new-job-received", buildOrder }); // TODO: verify log level
      matsProgress.set(0);
      elecProgress.set(0);
    }
  }
  $: matsProgress.set(matsCurrent);
  $: elecProgress.set(elecCurrent);
</script>

<span
  title={elecCurrent < elecTotal ? "Not enough electricity" : undefined}
  style="--elec-progress: {$elecProgress /
    elecTotal}; --mats-progress: {$matsProgress}"
  class:not-enough-elec={elecCurrent < elecTotal}
>
  {#if buildOrder && elecCurrent < elecTotal}
    <img src="/electric.svg" alt="Not enough electricity" />
  {/if}
  {#if buildOrder === undefined}
    Empty
  {:else}
    <BuildQueueItem {buildOrder} />
  {/if}
  {#if buildOrder && elecCurrent < elecTotal}
    <img src="/electric.svg" alt="Not enough electricity" />
  {/if}
</span>
{#if buildOrder && matsCurrent < matsTotal}
  <progress
    class="mats"
    aria-label="Materials availability to complete this build order"
    max={matsTotal}
    value={$matsProgress}
  >
    Materials Need Satisfied: {Math.floor($matsProgress * 100)}%
  </progress>
{/if}

<style>
  .not-enough-elec {
    color: grey;
  }
  .not-enough-elec img {
    display: inline-block;
    margin: 0 1ch;
    width: 1ch;
    --clip-top-boundary: calc((1 - var(--elec-progress)) * 100%);
    clip-path: inset(var(--clip-top-boundary) 0 0 0);
  }
</style>
