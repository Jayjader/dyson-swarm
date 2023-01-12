import { blankSave, makeSimulationStore, type SaveState } from "./events";
import { writable } from "svelte/store";
import { createMemoryStream } from "./events/processes/eventStream";
import { createClock } from "./events/processes/clock";

type AtTitle = ["title"];
type SaveSlotsFromTitle = [...AtTitle, "load"];
type InSimulation = [...AtTitle, ReturnType<typeof makeSimulationStore>];
type SaveSlotsFromSimulation = [...InSimulation, "load"];
export type AppUiState =
  | AtTitle
  | SaveSlotsFromTitle
  | InSimulation
  | SaveSlotsFromSimulation;

export function isAtTitle(s: AppUiState): s is AtTitle {
  return s.length === 1;
}
export function isAtSaveFromTitle(s: AppUiState): s is SaveSlotsFromTitle {
  return s.length === 2 && s[1] === "load";
}
export function isInSimulation(s: AppUiState): s is InSimulation {
  return s.length === 2 && s[1] !== "load";
}
export function isAtSaveFromSimulation(
  s: AppUiState
): s is SaveSlotsFromSimulation {
  return s.length === 3 && s[2] === "load";
}
export function toNewSimulation(s: AtTitle): InSimulation {
  const store = makeSimulationStore();
  store.loadSave(blankSave());
  store.insertProcessors(
    createMemoryStream(),
    createClock(window.performance.now(), "clock-0", { mode: "pause" })
  );
  // @ts-ignore
  s.push(store);
  // @ts-ignore
  return s;
}
function toSaveFromTitle(stack: AtTitle): SaveSlotsFromTitle {
  // @ts-ignore
  stack.push("load");
  // @ts-ignore
  return stack;
}

function backToTitle(stack: SaveSlotsFromTitle): AtTitle {
  stack.pop();
  // @ts-ignore
  return stack;
}

function intoSimulation(
  stack: SaveSlotsFromTitle,
  saveState: SaveState
): InSimulation {
  stack.pop();
  const store = makeSimulationStore();
  store.loadSave(saveState);
  // @ts-ignore
  stack.push(store);
  // @ts-ignore
  return stack;
}

function toSaveFromSimulation(stack: InSimulation): SaveSlotsFromSimulation {
  // @ts-ignore
  stack.push("load");
  // @ts-ignore
  return stack;
}

function backToSimulation(stack: SaveSlotsFromSimulation): InSimulation {
  stack.pop();
  // @ts-ignore
  return stack;
}

export function exitToTitle(stack: SaveSlotsFromSimulation): AtTitle {
  stack.pop();
  stack.pop();
  // @ts-ignore
  return stack;
}

export const APP_UI_CONTEXT = Symbol();

const stackStore = writable<AppUiState>(["title"]);
export const uiStore = {
  ...stackStore,
  startNewSimulation: () =>
    stackStore.update((stack) => toNewSimulation(<AtTitle>stack)),
  viewSaveSlots: () =>
    stackStore.update((stack) => toSaveFromTitle(<AtTitle>stack)),
  closeSaveSlots: () =>
    stackStore.update((stack) => backToTitle(<SaveSlotsFromTitle>stack)),
  startSimulation: (saveState: SaveState) =>
    stackStore.update((stack) =>
      intoSimulation(<SaveSlotsFromTitle>stack, saveState)
    ),
  viewSaveSlotsInSimulation: () =>
    stackStore.update((stack) => toSaveFromSimulation(<InSimulation>stack)),
  closeSaveSlotsInSimulation: () =>
    stackStore.update((stack) =>
      backToSimulation(<SaveSlotsFromSimulation>stack)
    ),
  closeSimulation: () =>
    stackStore.update((stack) => exitToTitle(<SaveSlotsFromSimulation>stack)),
};
