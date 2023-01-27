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

type Tag =
  //   | "warn-discard-on-close"
  "save" | "import" | "export" | "delete" | "load" | "clone";
type WarnBeforeClose = [SaveStubs, "warn-discard-on-close"];
type DialogOpen<D extends Tag> = [SaveStubs, number, D];

type Stack = NoSelection | SlotSelected | WarnBeforeClose | DialogOpen<Tag>;

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
  "warn-discard-on-close": {
    text: "This will discard any unsaved data from the current simulation. Discard unsaved data?",
    confirmText: "Discard",
  },
};
export const uiStore: Readable<Stack> & {
  updateStubs: (storage: Storage) => void;
  chooseSlot: (index: number) => void;
  unselectChosenSlot: () => void;
  startSaveAction: () => void;
  endSaveAction: () => void;
  startLoadAction: () => void;
  startDeleteAction: (name: string) => void;
  endDeleteAction: () => void;
  endLoadAction: () => void;
  startImportAction: () => void;
  endImportAction: () => void;
  startExportAction: () => void;
  endExportAction: () => void;
  startCloneAction: () => void;
  endCloneAction: () => void;
  // startCloseAction: () => void;
  // confirmDiscardBeforeClosing: () => void;
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
  startSaveAction: () =>
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      return [stubs, selectedIndex, "save"];
    }),
  endSaveAction: () =>
    update((stack) => {
      const [stubs] = <DialogOpen<"save">>stack;
      return [stubs];
    }),
  startDeleteAction: () =>
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      return [stubs, selectedIndex, "delete"];
    }),
  endDeleteAction: () =>
    update((stack) => {
      const [stubs] = <DialogOpen<"delete">>stack;
      return [stubs];
    }),
  startLoadAction: () =>
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      return [stubs, selectedIndex, "load"];
    }),
  endLoadAction: () =>
    update((stack) => {
      const [stubs] = <DialogOpen<"load">>stack;
      return [stubs];
    }),
  startImportAction: () =>
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      return [stubs, selectedIndex, "import"];
    }),
  endImportAction: () =>
    update((stack) => {
      const [stubs] = <DialogOpen<"import">>stack;
      return [stubs];
    }),
  startExportAction: () =>
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      return [stubs, selectedIndex, "export"];
    }),
  endExportAction: () =>
    update((stack) => {
      const [stubs] = <DialogOpen<"export">>stack;
      return [stubs];
    }),
  startCloneAction: () =>
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      return [stubs, selectedIndex, "clone"];
    }),
  endCloneAction: () =>
    update((stack) => {
      const [stubs] = <DialogOpen<"clone">>stack;
      return [stubs];
    }),
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
