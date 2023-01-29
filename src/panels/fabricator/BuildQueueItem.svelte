<script lang="ts">
  import { getContext } from "svelte";
  import { BUILD_QUEUE_STORE } from "./store";

  export let isRepeat;
  const mode = getContext(BUILD_QUEUE_STORE).mode;
</script>

<li
  class="flex flex-col gap-1 rounded border-2 bg-sky-300 text-gray-900"
  class:remove={$mode === "remove-build-order"}
  class:items-start={isRepeat}
  class:border-sky-500={!isRepeat}
  class:border-violet-200={isRepeat}
  class:bg-sky-800={isRepeat}
  class:border-double={!isRepeat}
  class:border-rose-500={$mode === "remove-build-order"}
  class:hover:border-rose-600={!isRepeat && $mode === "remove-build-order"}
  class:active:border-rose-600={!isRepeat && $mode === "remove-build-order"}
  class:hover:bg-rose-600={!isRepeat && $mode === "remove-build-order"}
>
  <!--
  {#if $mode === 'remove-repeat' && isRepeat}
    <button class="TODO" on:click={uiState.removeBuildOrder}>
    <slot />
    </button>
  {:else if $mode === "remove-build-order" && !isRepeat}
    <button
      class="hover:bg-rose-800"
      on:click={uiState.removeBuildOrder.bind(this, i)}
    >
    <slot />
    </button>
  {:else}
  -->
  <slot />
  <!--
  {/if}
  -->
</li>

<style>
  li {
    width: 100%;
  }
  li.remove {
    /* to preserve the overall page flow, we increase the width target this should compensate the lack of accompanying buttons contributing to the overall queue sub-panel width*/
    /* todo: is this still needed? 
    width: clamp(8rem, 36dvw, 20rem);*/
  }
</style>
