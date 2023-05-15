<script lang="ts">
  import { uiPanelsState } from "./store";
  import PanelControl from "./PanelControl.svelte";
  import type { ObjectiveTracker } from "../simulation/objectiveTracker/store";
  import { FabricatorOpened } from "../simulation/objectiveTracker/store";

  export let objectives: ObjectiveTracker;
</script>

<div class="flex flex-grow-0 flex-row justify-center gap-1 break-normal">
  <PanelControl
    meta={true}
    disabled={$uiPanelsState.size === 0}
    on:click={uiPanelsState.closeAllPanels}
  >
    Close All Panels
  </PanelControl>
  <div class="flex flex-row flex-wrap gap-1">
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
        : () => (
            uiPanelsState.openFabricator(),
            objectives.handleTriggers([FabricatorOpened])
          )}
    >
      Fabricator
    </PanelControl>
  </div>
</div>
