<script lang="ts">
  import { uiPanelsState } from "./store";
  import PanelControl from "./PanelControl.svelte";
</script>

<div class="flex flex-grow-0 flex-row flex-wrap justify-center gap-1">
  <PanelControl
    on={$uiPanelsState.size > 0}
    disabled={$uiPanelsState.size === 0}
    on:click={uiPanelsState.closeAllPanels}
  >
    Close All Panels
  </PanelControl>
  <PanelControl
    on={$uiPanelsState.has("construct-overview")}
    on:click={$uiPanelsState.has("construct-overview")
      ? uiPanelsState.closeConstructOverview
      : uiPanelsState.openConstructOverview}
  >
    Constructs
  </PanelControl>
  <PanelControl
    on={$uiPanelsState.has("storage-overview")}
    on:click={$uiPanelsState.has("storage-overview")
      ? uiPanelsState.closeStorageOverview
      : uiPanelsState.openStorageOverview}
  >
    Storage
  </PanelControl>
  <PanelControl
    on={$uiPanelsState.has("fabricator")}
    on:click={$uiPanelsState.has("fabricator")
      ? uiPanelsState.closeFabricator
      : uiPanelsState.openFabricator}
  >
    Fabricator
  </PanelControl>
</div>
