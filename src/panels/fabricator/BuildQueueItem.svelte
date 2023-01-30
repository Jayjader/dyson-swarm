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
    "w-full",
    "flex flex-col gap-1",
    isRepeat ? "items-start " : "",
    "rounded-md border-2",
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
    "text-slate-800",
  ].join(" ");
</script>

{#if !isButton}
  <li class={classes}>
    <slot />
  </li>
{:else}
  <li style="display: contents">
    <!--todo: focus semantics; might be waiting on https://bugzilla.mozilla.org/show_bug.cgi?id=1494196-->
    <button
      class={classes}
      class:active:border-rose-600={hovering}
      on:mouseover|stopPropagation={mouseover}
      on:mouseout|stopPropagation={mouseout}
      on:click|stopPropagation={onClick}
      aria-label={`${isRepeat ? "Repeat" : "Single"} at (${position.join(
        ", "
      )})`}
    >
      <slot />
    </button>
  </li>
{/if}
