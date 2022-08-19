<script lang="ts">
  import type { BuildOrder } from "../types";
  import { isAuto, isRepeat } from "../types";

  export let buildOrder: undefined | BuildOrder;
</script>

<span class:repeat={isRepeat(buildOrder) || isAuto(buildOrder)}>
  <img
    src="http://via.placeholder.com/24.png"
    alt={buildOrder ? buildOrder.building : "No build order"}
  />
  {#if isRepeat(buildOrder)}
    {buildOrder.building} x {buildOrder.count}
  {:else if isAuto(buildOrder)}
    {buildOrder.building} - 🗘 Auto
  {:else}
    {buildOrder.building}
  {/if}
</span>

<style>
  span {
    display: inline-block;
    width: 100%;
  }
  .repeat {
    border: 1px solid black;
  }
</style>
