import { writable } from "svelte/store";
import type { SimulationStore } from "./events";
import type { SettingsStore } from "./settings/store";
import type { ObjectiveTracker } from "./objectiveTracker/store";

export const MainMenu = Symbol("main menu");
export const SettingsMenu = Symbol("settings menu");
export const SaveMenu = Symbol("save slots menu");
export const Introduction = Symbol("introduction");
export const SimMenu = Symbol("in-simulation menu");

type Stack =
  | [SettingsStore, typeof MainMenu]
  | [SettingsStore, typeof MainMenu, typeof SettingsMenu]
  | [SettingsStore, typeof MainMenu, typeof SaveMenu]
  | [SettingsStore, typeof Introduction]
  | [SettingsStore, SimulationStore, ObjectiveTracker]
  | [SettingsStore, SimulationStore, ObjectiveTracker, typeof SimMenu]
  | [
      SettingsStore,
      SimulationStore,
      ObjectiveTracker,
      typeof SimMenu,
      typeof SettingsMenu
    ]
  | [
      SettingsStore,
      SimulationStore,
      ObjectiveTracker,
      typeof SimMenu,
      typeof SaveMenu
    ];

export function makeAppStateStore(settings: SettingsStore) {
  const { subscribe, update } = writable([settings, MainMenu]);
  return {
    subscribe,
    push: (...items: any[]) =>
      update((stack) => {
        stack.push(...items);
        return stack;
      }),
    pop: (count: number = 1) => {
      let popped;
      update((stack) => {
        popped = stack.splice(stack.length - count, count);
        return stack;
      });
      return popped;
    },
  };
}

export const APP_UI_CONTEXT = Symbol("app ui store");
