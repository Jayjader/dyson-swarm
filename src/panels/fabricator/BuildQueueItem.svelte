<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import {
    BUILD_QUEUE_STORE,
    areSamePosition,
    stackMode,
    areAtSameDepth,
    queryAt,
  } from "./store";
  import { isInfinite } from "../../types";

  export let isRepeat;
  export let position: { p: [number, ...number[]] };
  const uiState = getContext(BUILD_QUEUE_STORE).uiState;
  let mode,
    isInitial = false,
    isButton = false,
    onClick;
  let callback;
  callback = {
    "remove-build-order": uiState.removeBuildOrder,
    "remove-repeat-order": uiState.removeRepeatOrder,
    "unwrap-repeat-order": uiState.unwrapRepeatOrder,
    "add-repeat-select-initial": uiState.selectInitialForNewRepeat,
    "add-repeat-select-final": uiState.selectFinalForNewRepeat,
  };
  const uiSub = uiState.subscribe((stack) => {
    mode = stackMode(stack);
    isInitial =
      (mode === "add-repeat-select-final" || mode === "add-repeat-confirm") &&
      areSamePosition(stack[0].initial, position.p);
    isButton =
      (mode === "add-repeat-select-initial" &&
        !isInfinite(queryAt(position.p, stack[1].present.queue))) ||
      (mode === "add-repeat-select-final" &&
        areAtSameDepth(stack[0].initial, position.p) &&
        !isInfinite(queryAt(position.p, stack[1].present.queue))) ||
      (isRepeat &&
        (mode === "remove-repeat-order" || mode === "unwrap-repeat-order")) ||
      (!isRepeat && mode === "remove-build-order");
    onClick = isButton ? callback[mode]?.bind(this, position.p) : undefined;
  });
  onDestroy(uiSub);

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
    isInitial ? "initial" : "",
    "text-slate-800",
  ]
    .filter((c) => c.length > 0)
    .join(" ");
</script>

{#if !isButton}
  <li class={classes} data-position={JSON.stringify(position.p)}>
    <slot />
  </li>
{:else}
  <li style="display: contents">
    <!--todo: focus semantics; might be waiting on https://bugzilla.mozilla.org/show_bug.cgi?id=1494196-->
    <button
      class={classes}
      class:active:border-rose-600={hovering}
      on:mouseover|stopPropagation={mouseover}
      on:focus|stopPropagation={mouseover}
      on:mouseout|stopPropagation={mouseout}
      on:blur|stopPropagation={mouseout}
      on:click|stopPropagation={onClick}
      aria-label={`${isRepeat ? "Repeat" : "Single"} at (${position.p.join(
        ", "
      )})`}
    >
      <slot />
    </button>
  </li>
{/if}

<style>
  li.initial,
  button.initial {
    box-shadow: inset 0 0 0.75rem 0.5rem #a21caf /*fuchsia-700*/;
  }
</style>
