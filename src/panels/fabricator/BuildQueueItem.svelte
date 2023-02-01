<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import {
    areAtSameDepth,
    areSamePosition,
    BUILD_QUEUE_STORE,
    stackMode,
  } from "./store";

  export let repeat: undefined | number;
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
    {
      const canBeInitialBoundary =
        mode === "add-repeat-select-initial" &&
        (repeat === undefined || Number.isFinite(repeat));
      const canBeFinalBoundary =
        mode === "add-repeat-select-final" &&
        areAtSameDepth(stack[0].initial, position.p) &&
        (repeat === undefined || Number.isFinite(repeat));
      const canBeRemoved =
        (repeat !== undefined &&
          (mode === "remove-repeat-order" || mode === "unwrap-repeat-order")) ||
        (repeat === undefined && mode === "remove-build-order");
      isButton = canBeInitialBoundary || canBeFinalBoundary || canBeRemoved;
    }
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
    repeat !== undefined ? "items-start " : "",
    "rounded-md border-2",
    isButton
      ? hovering
        ? "border-rose-600"
        : "border-rose-500"
      : repeat !== undefined
      ? "border-violet-200"
      : "border-sky-500",
    isButton && hovering
      ? "bg-rose-800"
      : repeat !== undefined && !hovering
      ? "bg-sky-800"
      : "bg-sky-300",
    isInitial ? "initial" : "",
    "text-slate-800",
  ]
    .filter((c) => c.length > 0)
    .join(" ");
</script>

<!-- todo: combine div and button using <svelte:element/>
 make sure to move the stopPropagation inside the function
 (i.e. don't leave the |stopPropagation on the div) -->
{#if !isButton}
  <div class={classes} data-position={JSON.stringify(position.p)}>
    <slot />
  </div>
{:else}
  <!--todo: focus semantics; might be waiting on https://bugzilla.mozilla.org/show_bug.cgi?id=1494196-->
  <button
    class={classes}
    class:active:border-rose-600={hovering}
    on:mouseover|stopPropagation={mouseover}
    on:focus|stopPropagation={mouseover}
    on:mouseout|stopPropagation={mouseout}
    on:blur|stopPropagation={mouseout}
    on:click|stopPropagation={onClick}
    aria-label={`${
      repeat !== undefined ? "Repeat" : "Single"
    } at (${position.p.join(", ")})`}
  >
    <slot />
  </button>
{/if}

<style>
  li.initial,
  button.initial {
    box-shadow: inset 0 0 0.75rem 0.5rem #a21caf /*fuchsia-700*/;
  }
</style>
