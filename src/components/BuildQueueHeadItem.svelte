<script lang="ts">
  import type { BuildOrder } from "../types";
  import { isAuto } from "../types";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

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
  export let buildOrder: BuildOrder;
  export let matsTotal = 1,
    matsCurrent = 0;
  export let elecTotal = 1,
    elecCurrent = 1;
  $: matsProgress.set(matsCurrent / matsTotal);
  $: elecProgress.set(elecCurrent / elecTotal);
</script>

<li
  style="--elec-progress: {$elecProgress}; --mats-progress: {$matsProgress}"
  class:not-enough-elec={$elecProgress < 1}
>
  <span title={$elecProgress < 1 ? "Not enough electricity" : null}>
    {#if $elecProgress < 1}<img
        src="/electric.svg"
        alt="Not enough electricity"
      />{/if}{#if isAuto(buildOrder)}{buildOrder.building} - 🗘 Auto{:else}{buildOrder.building}{/if}{#if $elecProgress < 1}<img
        src="/electric.svg"
        alt="Not enough electricity"
      />{/if}</span
  >{#if $matsProgress < 1}<progress
      class="mats"
      aria-label="Materials availability to complete this build order"
      max={matsTotal}
      value={matsCurrent}
      >Materials Need Satisfied: {Math.floor($matsProgress * 100)}%</progress
    >{/if}
</li>

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
