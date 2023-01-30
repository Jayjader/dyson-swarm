<script lang="ts">
  import { getContext } from "svelte";
  import { BUILD_QUEUE_STORE } from "./store";
  import NestableButton from "./NestableButton.svelte";

  export let isRepeat;
  export let position: [number, ...number[]];
  const { mode, uiState } = getContext(BUILD_QUEUE_STORE);
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
  <!--  <div>position: {position}</div>-->
  {#if isRepeat && $mode === "remove-repeat-order"}
    <NestableButton on:click={uiState.removeRepeatOrder.bind(this, position)}>
      <slot />
    </NestableButton>
  {:else if isRepeat && $mode === "unwrap-repeat-order"}
    <NestableButton on:click={uiState.unwrapRepeatOrder.bind(this, position)}>
      <slot />
    </NestableButton>
  {:else if !isRepeat && $mode === "remove-build-order"}
    <NestableButton on:click={uiState.removeBuildOrder.bind(this, position)}>
      <slot />
    </NestableButton>
  {:else}
    <slot />
  {/if}
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
