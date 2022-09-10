import { derived, writable } from "svelte/store";

const uiStateStack = writable([]);
export const uiPanelsState = {
  ...derived(uiStateStack, (stack) => stack),
  openFabricator: () => {
    console.info({ command: "open-fabricator" });
    uiStateStack.set(["fabricator"]);
  },
  openOverview: () => {
    console.info({ command: "open-overview" });
    uiStateStack.set(["overview"]);
  },
  closePanels: () => {
    console.info({ command: "close-panels" });
    uiStateStack.set([]);
  },
};
