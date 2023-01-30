<script lang="ts">
  import { getContext } from "svelte";
  import { BUILD_QUEUE_STORE } from "./store";

  export let isRepeat;
  export let position: [number, ...number[]];
  const { mode, uiState } = getContext(BUILD_QUEUE_STORE);
  let isButton = false,
    onClick;
  const callback = {
    "remove-build-order": uiState.removeBuildOrder,
    "remove-repeat-order": uiState.removeRepeatOrder,
    "unwrap-repeat-order": uiState.unwrapRepeatOrder,
  };
  mode.subscribe((tag) => {
    isButton =
      (isRepeat &&
        (tag === "remove-repeat-order" || tag === "unwrap-repeat-order")) ||
      (!isRepeat && tag === "remove-build-order");
    onClick = isButton ? callback[tag]?.bind(this, position) : undefined;
  });

  let hovering = false;
  $: mouseover = () => {
    if (!hovering) {
      hovering = true;
    }
  };
  $: mouseout = () => {
    if (hovering) {
      hovering = false;
    }
  };

  $: classes = [
    isButton
      ? hovering
        ? "border-rose-600"
        : "border-rose-500"
      : isRepeat
      ? "border-violet-200"
      : "border-sky-500",
    isButton && hovering
      ? "bg-rose-800"
      : isRepeat && !hovering
      ? "bg-sky-800"
      : "bg-sky-300",
    isRepeat ? "items-start " : "",
  ].join(" ");
</script>

{#if !isButton}
  <li class="flex flex-col gap-1 rounded-md border-2 text-slate-800 {classes}">
    <slot />
  </li>
{:else}
  <li
    class="flex flex-col gap-1 rounded-md border-2 text-slate-800 {classes} hover:cursor-pointer"
    class:active:border-rose-600={hovering}
    tabindex="0"
    on:mouseover|stopPropagation={mouseover}
    on:mouseout|stopPropagation={mouseout}
    on:click|stopPropagation={onClick}
  >
    <!--todo: focus semantics; might be waiting on https://bugzilla.mozilla.org/show_bug.cgi?id=1494196-->
    <button
      style="display: contents"
      on:mouseover|stopPropagation={mouseover}
      on:mouseout|stopPropagation={mouseout}
      on:click|stopPropagation={onClick}
    >
      <slot />
    </button>
  </li>
{/if}

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
