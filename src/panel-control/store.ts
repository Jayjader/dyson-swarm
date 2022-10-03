import { derived, writable } from "svelte/store";

const uiStateStack = writable<
  Set<"construct-overview" | "storage-overview" | "fabricator" | "order-queue">
>(new Set());
export const uiPanelsState = {
  ...derived(uiStateStack, (stack) => stack),
  closeAllPanels: () => {
    console.info({ command: "close-panels" });
    uiStateStack.set(new Set());
  },
  openConstructOverview: () => {
    console.info({ command: "open-construct-overview" });
    uiStateStack.update((state) => state.add("construct-overview"));
  },
  openStorageOverview: () => {
    console.info({ command: "open-storage-overview" });
    uiStateStack.update((state) => state.add("storage-overview"));
  },
  closeConstructOverview: () => {
    console.info({ command: "close-construct-overview" });
    uiStateStack.update((state) => {
      state.delete("construct-overview");
      return state;
    });
  },
  closeStorageOverview: () => {
    console.info({ command: "close-storage-overview" });
    uiStateStack.update((state) => {
      state.delete("storage-overview");
      return state;
    });
  },
  openFabricator: () => {
    console.info({ command: "open-fabricator" });
    uiStateStack.update((state) => state.add("fabricator"));
  },
  closeFabricator: () => {
    console.info({ command: "close-fabricator" });
    uiStateStack.update((state) => {
      state.delete("fabricator");
      return state;
    });
  },
  openQueue: () => {
    console.info({ command: "open-queue" });
    uiStateStack.update((state) => state.add("order-queue"));
  },
  closeQueue: () => {
    console.info({ command: "close-queue" });
    uiStateStack.update((state) => {
      state.delete("order-queue");
      return state;
    });
  },
};
