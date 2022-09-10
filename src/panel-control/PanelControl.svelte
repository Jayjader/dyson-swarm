<script lang="ts">
  import { uiPanelsState } from "./store";
</script>

<div class="span-entire-row flex flex-row justify-center">
  <button
    class={"border-2 rounded " +
      ($uiPanelsState?.[0] === "fabricator"
        ? "border-stone-400 text-stone-300"
        : "border-stone-600 text-stone-500")}
    on:click={$uiPanelsState?.[0] === "fabricator"
      ? uiPanelsState.closePanels
      : uiPanelsState.openFabricator}
  >
    Fabricator
  </button>
  <button
    class={"border-2 rounded " +
      ($uiPanelsState?.[0] === "overview"
        ? "border-stone-400 text-stone-300"
        : "border-stone-600 text-stone-500")}
    on:click={$uiPanelsState?.[0] === "overview"
      ? uiPanelsState.closePanels
      : uiPanelsState.openOverview}
  >
    Overview
  </button>
</div>
