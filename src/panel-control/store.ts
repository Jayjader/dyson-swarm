import { derived, writable } from "svelte/store";

const uiState = writable<
  Set<"construct-overview" | "storage-overview" | "fabricator" | "order-queue">
>(new Set());
export const uiPanelsState = {
  ...derived(uiState, (state) => state),
  closeAllPanels: () => {
    console.info({ command: "close-panels" });
    uiState.set(new Set());
  },
  openConstructOverview: () => {
    console.info({ command: "open-construct-overview" });
    uiState.update((state) => state.add("construct-overview"));
  },
  openStorageOverview: () => {
    console.info({ command: "open-storage-overview" });
    uiState.update((state) => state.add("storage-overview"));
  },
  closeConstructOverview: () => {
    console.info({ command: "close-construct-overview" });
    uiState.update((state) => {
      state.delete("construct-overview");
      return state;
    });
  },
  closeStorageOverview: () => {
    console.info({ command: "close-storage-overview" });
    uiState.update((state) => {
      state.delete("storage-overview");
      return state;
    });
  },
  openFabricator: () => {
    console.info({ command: "open-fabricator" });
    uiState.update((state) => state.add("fabricator"));
  },
  closeFabricator: () => {
    console.info({ command: "close-fabricator" });
    uiState.update((state) => {
      state.delete("fabricator");
      return state;
    });
  },
};
