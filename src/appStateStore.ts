import { writable } from "svelte/store";
import { makeSimulationStore, type SimulationStore } from "./events";
import type { SettingsStore } from "./settings/store";
import { makeObjectiveTracker } from "./objectiveTracker/store";
import { initInMemoryAdapters, initSqlAdapters } from "./adapters";
import type { SaveState } from "./save/save";
import { getOrCreateSqlWorker } from "./events/sqlWorker";

type BaseAppState = {
  settings: SettingsStore;
};
type AppState = BaseAppState & {
  simulation: SimulationStore | undefined;
  inMenu: boolean;
  inSettings: boolean;
  inSave: boolean;
};

export function makeAppStateStore(settings: SettingsStore, inMemory: boolean) {
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
    closeMenu() {
      update((state) => {
        state.inMenu = false;
        return state;
      });
    },
    async startNewSim(showIntro: boolean) {
      const objectiveTracker = makeObjectiveTracker();
      if (showIntro) {
        objectiveTracker.setActive([0]); // Intro
      }
      const adapters = inMemory
        ? initInMemoryAdapters()
        : initSqlAdapters(await getOrCreateSqlWorker());
      const simulationStore = makeSimulationStore(objectiveTracker, adapters);
      await simulationStore.loadNew();
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
    async loadExistingSim(saveState: SaveState) {
      this.closeSave();
      this.closeMenu();
      this.closeSettings();
      return new Promise<void>((resolve) => {
        subscribe(async (store) => {
          if (!store.simulation) {
            const objTrackerStore = makeObjectiveTracker();
            const adapters = inMemory
              ? initInMemoryAdapters()
              : initSqlAdapters(await getOrCreateSqlWorker());
            const newStore = makeSimulationStore(objTrackerStore, adapters);
            await newStore.loadSave(saveState);
            update((store) => {
              store.simulation = newStore;
              return store;
            });
          } else {
            await store.simulation.loadSave(saveState);
          }
          resolve();
        });
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
