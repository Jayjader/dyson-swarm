import { writable } from "svelte/store";
import { makeSimulationStore, type SimulationStore } from "./events";
import type { SettingsStore } from "./settings/store";
import { makeObjectiveTracker } from "./objectiveTracker/store";
import type { Adapters } from "./adapters";

type BaseAppState = {
  settings: SettingsStore;
};
type AppState = BaseAppState & {
  simulation: SimulationStore | undefined;
  inMenu: boolean;
  inSettings: boolean;
  inSave: boolean;
};

export function makeAppStateStore(settings: SettingsStore) {
  const { subscribe, update } = writable<AppState>({
    settings,
    simulation: undefined,
    inMenu: false,
    inSettings: false,
    inSave: false,
  });
  return {
    subscribe,
    openSave() {
      update((state) => {
        state.inSave = true;
        return state;
      });
    },
    closeSave() {
      update((state) => {
        state.inSave = false;
        return state;
      });
    },
    openSettings() {
      update((state) => {
        state.inSettings = true;
        return state;
      });
    },
    exitSettingsAndSim() {
      update(({ settings }) => {
        return {
          settings,
          simulation: undefined,
          inMenu: false,
          inSettings: false,
          inSave: false,
        };
      });
    },
    closeSettings() {
      update((state) => {
        state.inSettings = false;
        return state;
      });
    },
    openMenu() {
      update((state) => {
        state.inMenu = true;
        return state;
      });
    },
    async startNewSim(
      adapters: Adapters,
      outsideClockTick: DOMHighResTimeStamp,
      showIntro: boolean,
    ) {
      const objectiveTracker = makeObjectiveTracker();
      if (showIntro) {
        objectiveTracker.setActive([0]); // Intro
      }
      const simulationStore = await makeSimulationStore(
        objectiveTracker,
        adapters,
      ).loadNew(outsideClockTick);
      update(({ settings }) => {
        return {
          settings,
          simulation: simulationStore,
          inMenu: false,
          inSettings: false,
          inSave: false,
        };
      });
    },
    clearProgress() {
      update((state) => {
        state.simulation?.objectives.clearProgress();
        return state;
      });
    },
  };
}
export type AppStateStore = ReturnType<typeof makeAppStateStore>;

export const APP_UI_CONTEXT = Symbol("app ui store");
