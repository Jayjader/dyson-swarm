import type { SaveState } from "./save";
import { type Readable, writable } from "svelte/store";

export enum Slot {
  AUTO = "auto",
  NAMES = "slots",
  NAME = "single-save",
}

export type SaveStub = { name: string };
export type Save = SaveStub & SaveState;
export type SaveStubs = {
  slots: SaveStub[];
  autoSave: null | { name: "AUTOSAVE" };
};
export function slotStorageKey(s: Slot) {
  switch (s) {
    case Slot.NAMES:
    case Slot.AUTO:
      // this is only a function because I couldn't find a way to make the compiler
      // understand that passing one of these as argument here would guarantee directly
      // being a string
      return () => `save_slots--${s}`;
    case Slot.NAME:
      return (name: string) => `save_slots--${name}`;
  }
}

type NoSelection = [SaveStubs];
type SlotSelected = [SaveStubs, number];

// type Tag =
//   | "closed"
//   | "warn-overwrite-on-save"
//   | "warn-overwrite-on-import"
//   | "warn-discard-on-load"
//   | "warn-discard-on-close"
//   | "save"
//   | "import"
//   | "export"
//   | "delete"
//   | "loading";
type Text = { text: string };
type Control = { label: string };
// type Content<tag extends Tag> = tag extends "closed"
//   ? never
//   : tag extends "loading"
//   ? {
//       previous: "save" | "import" | "export" | "delete";
//       promise: Promise<SaveState>;
//     }
//   : { confirmText: string } & (tag extends
//       | "warn-overwrite-on-save"
//       | "warn-overwrite-on-import"
//       | "warn-discard-on-load"
//       | "warn-discard-on-close"
//       | "delete"
//       ? Text
//       : tag extends "save" | "import" | "export"
//       ? Control
//       : never);
// type Dialog<dialogType extends Tag> = { tag: dialogType } & Content<dialogType>;
type WarnBeforeClose = [SaveStubs, { confirmText: string } & Text];
type DialogOpen<D extends "delete"> = [
  SaveStubs,
  number,
  "delete"
  // ReturnType<typeof makeDeleteDialogStore>
];

type Stack =
  | NoSelection
  | SlotSelected
  | WarnBeforeClose
  | DialogOpen<"delete">;

function chooseSlot(
  stack: NoSelection | SlotSelected,
  index: number
): SlotSelected {
  const [stubs] = stack;
  return [stubs, index];
}
function unselectChosenSlot(stack: SlotSelected): NoSelection {
  const [stubs] = stack;
  return [stubs];
}

function readStubs(storage: Storage): SaveStubs {
  const existingAutosave = storage.getItem(
    slotStorageKey(Slot.AUTO)("useless-string")
  );
  const autoSave =
    existingAutosave === null ? null : JSON.parse(existingAutosave);
  const slotNames = storage.getItem(
    slotStorageKey(Slot.NAMES)("useless-string")
  );
  const slots = (
    slotNames === null ? [] : [...new Set(JSON.parse(slotNames) as string[])]
  ).map((name) => ({
    name,
  }));
  return { autoSave, slots };
}

const { subscribe, update, set } = writable<Stack>([
  {
    autoSave: null,
    slots: [],
  },
]);
const dialogContent = {
  "warn-overwrite-on-import": {
    text: "This will overwrite the existing simulation data in this save slot. Overwrite old data with new?",
    confirmText: "Overwrite",
  },
  "warn-overwrite-on-save": {
    text: "This will overwrite the existing simulation data in this save slot. Overwrite old data with new?",
    confirmText: "Overwrite",
  },
  "warn-discard-on-load": {
    text: "This will discard any unsaved data from the current simulation. Discard unsaved data?",
    confirmText: "Discard",
  },
  "warn-discard-on-close": {
    text: "This will discard any unsaved data from the current simulation. Discard unsaved data?",
    confirmText: "Discard",
  },
  delete: {
    text: "This will delete the existing simulation data in this save slot. Delete saved data?",
    confirmText: "Delete",
  },
  export: { label: "File name", confirmText: "Export" },
  import: { label: "Pick file", confirmText: "Import" },
  save: { label: "Save name", confirmText: "Save" },
};
export const uiStore: Readable<Stack> & {
  updateStubs: (storage: Storage) => void;
  chooseSlot: (index: number) => void;
  unselectChosenSlot: () => void;
  // startSaveAction: () => void;
  // confirmOverwrite: () => void;
  // confirmSave: (name: string, simulation: Simulation, storage: Storage) => void;
  // deleteChosen: (storage: Storage) => void;
  // startLoadAction: (inSimulation: boolean, storage: Storage) => void;
  startDeleteAction: (name: string) => void;
  endDeleteAction: () => void;
  // confirmDiscardBeforeLoad: (storage: Storage) => void;
  // finishLoading: () => void;
  // startCloseAction: () => void;
  // confirmDiscardBeforeClosing: () => void;
  // confirmExport: (fileName: string, storage: Storage, root: Document) => void;
} = {
  subscribe,
  updateStubs: (storage: Storage) =>
    update(([_oldStubs, ...restOfStack]) => [
      readStubs(storage),
      ...restOfStack,
    ]),
  chooseSlot: (index: number) =>
    update((stack) => chooseSlot(<NoSelection>stack, index)),
  unselectChosenSlot: () =>
    update((stack) => unselectChosenSlot(<SlotSelected>stack)),
  /*
  startSaveAction: () =>
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      const willOverWrite =
        0 < selectedIndex && selectedIndex < stubs.slots.length;
      return [
        stubs,
        selectedIndex,
        willOverWrite
          ? {
              tag: "warn-overwrite-on-save",
              text: "This will overwrite the existing simulation data in this save slot. Overwrite old data with new?",
              confirmText: "Overwrite",
            }
          : { tag: "save", label: "Name the save:", confirmText: "Save" },
      ];
    }),
*/
  /*
  confirmOverwrite: () =>
    update((stack) => {
      const [stubs, selectedIndex] = <DialogOpen<"warn-overwrite-on-save">>(
        stack
      );
      return [
        stubs,
        selectedIndex,
        { tag: "save", label: "Name the save:", confirmText: "Save" },
      ];
    }),
*/
  /*
  confirmSave: (name: string, simulation: Simulation, storage: Storage) => {
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      const willOverWrite =
        0 < selectedIndex && selectedIndex < stubs.slots.length;
      if (willOverWrite) {
        deleteSave(storage, stubs.slots[selectedIndex].name);
      }
      writeSlotToStorage({ name, ...generateSave(simulation) }, storage);
      return [readStubs(storage)];
    });
  },
*/
  startDeleteAction: (name: string) =>
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      // const deleteStore = makeDeleteDialogStore(name);
      return [
        stubs,
        selectedIndex,
        "delete",
        // {
        //   tag: "delete",
        //   text: "This will delete the existing simulation data in this save slot. Delete saved data?",
        //   confirmText: "Delete",
        // },
      ];
    }),
  endDeleteAction: () =>
    update((stack) => {
      const [stubs] = <DialogOpen<"delete">>stack;
      return [stubs];
    }),
  /*
  deleteChosen: (storage: Storage) =>
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      deleteSave(
        storage,
        selectedIndex === -1 ? "AUTOSAVE" : stubs.slots[selectedIndex].name
      );
      return [stubs];
    }),
*/
  /*
  startLoadAction: (inSimulation: boolean, storage: Storage) => {
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      return [
        stubs,
        selectedIndex,
        inSimulation
          ? {
              tag: "warn-discard-on-load",
              text: "This will discard any unsaved data from the current simulation. Discard unsaved data?",
              confirmText: "Discard",
            }
          : {
              tag: "loading",
            previous: 'load',
              promise: new Promise((resolve, reject) => {
                const saveState = readSave(
                  selectedIndex === -1
                    ? "AUTOSAVE"
                    : stubs.slots[selectedIndex].name,
                  storage
                );
                if (saveState !== null) {
                  resolve(saveState);
                } else {
                  reject({ message: "Could not read save state" });
                }
              }),
            },
      ];
    });
  },
*/
  /*
  confirmDiscardBeforeLoad: (storage: Storage) =>
    update((stack) => {
      const [stubs, selectedIndex] = <DialogOpen<"warn-discard-on-load">>stack;
      return [
        stubs,
        selectedIndex,
        {
          tag: "loading",
          previous: '',
          promise: new Promise((resolve, reject) => {
            const saveState = readSave(
              selectedIndex === -1
                ? "AUTOSAVE"
                : stubs.slots[selectedIndex].name,
              storage
            );
            if (saveState !== null) {
              resolve(saveState);
            } else {
              reject({ message: "Could not read save state" });
            }
          }),
        },
      ];
    }),
*/
  /*
  finishLoading: () =>
    update((stack) => {
      const [stubs] = <DialogOpen<"loading">>stack;
      return [stubs];
    }),
*/
  /*
  startCloseAction: () =>
    update((stack) => {
      const [stubs] = <NoSelection>stack;
      return [
        stubs,
        {
          tag: "warn-discard-on-close",
          text: "This will discard any unsaved data from the current simulation. Discard unsaved data?",
          confirmText: "Discard",
        },
      ];
    }),
*/
  /*
  confirmDiscardBeforeClosing: () => update(([stubs, _dialog]) => [stubs]),
*/
  /*
  confirmExport: (fileName, storage, root) =>
    update((stack) => {
      const [stubs, selectedIndex] = <DialogOpen<"export">>stack;
      const slotName =
        selectedIndex === -1 ? "AUTOSAVE" : stubs.slots[selectedIndex].name;
      return [
        stubs,
        {
          tag: "loading",
          previous: "export",
          promise: new Promise((resolve, reject) => {
            const saveState = readSave(slotName, storage) as null | Save;
            if (saveState === null) {
              reject({ message: "Could not read save state" });
            } else {
              saveState.name = fileName;
              resolve(saveState);
            }
          }),
        },
      ];
    }),
*/
};
