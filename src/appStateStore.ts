import { get, writable } from "svelte/store";
import { makeSimulationStore } from "./events";
import type { SaveState } from "./save/save";
import { getPrimitive } from "./hud/types";
import { getClock } from "./events/processes/clock";

type AtTitle = ["title"];
type SettingsFromTitle = [...AtTitle, "settings"];
type SaveSlotsFromTitle = [...AtTitle, "load"];
type InSimulation = [...AtTitle, ReturnType<typeof makeSimulationStore>];
type MenuFromSimulation = [...InSimulation, "menu"];
type SettingsFromSimulation = [...MenuFromSimulation, "settings"];
type SaveSlotsFromSimulation = [...MenuFromSimulation, "load"];
export type AppUiState =
  | AtTitle
  | SettingsFromTitle
  | SaveSlotsFromTitle
  | InSimulation
  | MenuFromSimulation
  | SettingsFromSimulation
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
  return s.length === 4 && s[3] === "load";
}
export function simulationIsLoaded(
  s: AppUiState
): s is InSimulation | SaveSlotsFromSimulation {
  return s.length >= 2 && typeof s[1] !== "string";
}

export function isInSettings(s: AppUiState): s is SettingsFromTitle {
  return s.length == 2 && s[1] === "settings";
}

export function toSettings(
  s: AtTitle | MenuFromSimulation
): typeof s extends AtTitle ? SettingsFromTitle : SettingsFromSimulation {
  // @ts-ignore
  s.push("settings");
  // @ts-ignore
  return s;
}

export function closeSettings(
  s: SettingsFromTitle | SettingsFromSimulation
): typeof s extends SettingsFromTitle ? AtTitle : MenuFromSimulation {
  s.pop();
  // @ts-ignore
  return s;
}

export function settingsIsOpened(
  s: AppUiState
): s is SettingsFromTitle | SettingsFromSimulation {
  return s.at(-1) === "settings";
}

function openMenu(stack: InSimulation): MenuFromSimulation {
  const currentTick = getPrimitive(getClock(get(stack[1]))).tick;
  const busEvent = {
    tag: "command-simulation-clock-indirect-pause",
    afterTick: currentTick,
    timeStamp: performance.now(),
  } as const;
  console.info(busEvent);
  stack[1].broadcastEvent(busEvent);
  // @ts-ignore
  stack.push("menu");
  // @ts-ignore
  return stack;
}
function closeMenu(stack: MenuFromSimulation): InSimulation {
  const currentTick = getPrimitive(getClock(get(stack[1]))).tick;
  const busEvent = {
    tag: "command-simulation-clock-indirect-resume",
    afterTick: currentTick,
    timeStamp: performance.now(),
  } as const;
  console.info(busEvent);
  stack[1].broadcastEvent(busEvent);
  stack.pop();
  // @ts-ignore
  return stack;
}

function toNewSimulation(s: AtTitle): InSimulation {
  const store = makeSimulationStore();
  store.loadNew(window.performance.now());
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
  const currentTick = getPrimitive(getClock(get(store))).tick;
  const busEvent = {
    tag: "command-simulation-clock-indirect-resume",
    afterTick: currentTick,
    timeStamp: performance.now(),
  } as const;
  console.info(busEvent);
  store.broadcastEvent(busEvent);
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

function loadSaveInSimulation(
  stack: SaveSlotsFromSimulation,
  saveState: SaveState
): InSimulation {
  stack[1].loadSave(saveState);
  const currentTick = getPrimitive(getClock(get(stack[1]))).tick;
  const busEvent = {
    tag: "command-simulation-clock-indirect-resume",
    afterTick: currentTick,
    timeStamp: performance.now(),
  } as const;
  console.info(busEvent);
  stack[1].broadcastEvent(busEvent);
  stack.pop();
  // @ts-ignore
  return stack;
}
function exitToTitle(stack: MenuFromSimulation): AtTitle {
  stack.pop();
  stack.pop();
  // @ts-ignore
  return stack;
}

export const APP_UI_CONTEXT = Symbol("app ui store");

const stackStore = writable<AppUiState>(["title"]);
export const uiStore = {
  ...stackStore,
  viewSettings: () =>
    stackStore.update((stack) =>
      toSettings(<AtTitle | MenuFromSimulation>stack)
    ),
  closeSettings: () =>
    stackStore.update((stack) =>
      closeSettings(<SettingsFromTitle | SettingsFromSimulation>stack)
    ),
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
  replaceRunningSimulation: (saveState: SaveState) =>
    stackStore.update((stack) =>
      loadSaveInSimulation(<SaveSlotsFromSimulation>stack, saveState)
    ),
  closeSimulation: () =>
    stackStore.update((stack) => exitToTitle(<MenuFromSimulation>stack)),
  openMenu: () => stackStore.update((stack) => openMenu(<InSimulation>stack)),
  closeMenu: () =>
    stackStore.update((stack) => closeMenu(<MenuFromSimulation>stack)),
};
