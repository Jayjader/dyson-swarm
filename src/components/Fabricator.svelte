<script lang="ts">
  import type { BuildOrder } from "../types";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import BuildQueueItem from "./BuildQueueItem.svelte";
  import { currentJob } from "../store/fabricator";

  const matsProgress = tweened<number>(0, {
    duration: 150,
    easing: cubicOut,
    interpolate: (from, to) => (t) => from + Math.floor(t * (to - from)),
  });
  const elecProgress = tweened<number>(1, {
    duration: 150,
    easing: cubicOut,
    interpolate: (from, to) => (t) => from + Math.round(t * (to - from)),
  });
  export let matsTotal = 1,
    matsCurrent = 0;
  export let elecTotal = 1,
    elecCurrent = 1;
  let buildOrder: null | BuildOrder;
  $: {
    buildOrder = $currentJob;
    if (buildOrder) {
      console.debug("new build order");
      matsProgress.set(0);
      elecProgress.set(0);
    }
  }
  $: matsProgress.set(Math.min(matsCurrent / matsTotal, 1));
  $: elecProgress.set(Math.min(elecCurrent / elecTotal, 1));
  $: console.debug({ buildOrder });
</script>

<span
  title={$elecProgress < 1 ? "Not enough electricity" : undefined}
  style="--elec-progress: {$elecProgress}; --mats-progress: {$matsProgress}"
  class:not-enough-elec={$elecProgress < 1}
>
  {#if buildOrder && $elecProgress < 1}
    <img src="/electric.svg" alt="Not enough electricity" />
  {/if}
  {#if buildOrder === null}
    Empty
  {:else}
    <BuildQueueItem {buildOrder} />
  {/if}
  {#if buildOrder && $elecProgress < 1}
    <img src="/electric.svg" alt="Not enough electricity" />
  {/if}
</span>
{#if buildOrder && $matsProgress < 1}
  <progress
    class="mats"
    aria-label="Materials availability to complete this build order"
    max={matsTotal}
    value={matsCurrent}
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
