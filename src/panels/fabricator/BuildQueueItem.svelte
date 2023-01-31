<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import { BUILD_QUEUE_STORE, stackMode } from "./store";

  export let isRepeat;
  export let position: [number, ...number[]];
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
      stack[0].initial.every((p, index) => position.at(index) === p);
    isButton =
      mode === "add-repeat-select-initial" ||
      (mode === "add-repeat-select-final" &&
        stack[0].initial.length === position.length &&
        stack[0].initial
          .slice(0, -1)
          .every((f, index) => position.at(index) === f)) ||
      (isRepeat &&
        (mode === "remove-repeat-order" || mode === "unwrap-repeat-order")) ||
      (!isRepeat && mode === "remove-build-order");
    onClick = isButton ? callback[mode]?.bind(this, position) : undefined;
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
    "text-slate-800",
  ]
    .filter((c) => c.length > 0)
    .join(" ");
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
      class:initial={isInitial}
      class:active:border-rose-600={hovering}
      on:mouseover|stopPropagation={mouseover}
      on:focus|stopPropagation={mouseover}
      on:mouseout|stopPropagation={mouseout}
      on:blur|stopPropagation={mouseout}
      on:click|stopPropagation={onClick}
      aria-label={`${isRepeat ? "Repeat" : "Single"} at (${position.join(
        ", "
      )})`}
    >
      <slot />
    </button>
  </li>
{/if}

<style>
  button.initial {
    box-shadow: inset 0 0 0.75rem 0.5rem #db2777 /*pink-600*/;
  }
</style>
