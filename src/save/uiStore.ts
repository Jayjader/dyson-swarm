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

type Tag = "save" | "import" | "export" | "delete" | "load" | "clone";
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

const { subscribe, update } = writable<Stack>([
  {
    autoSave: null,
    slots: [],
  },
]);
export const uiStore: Readable<Stack> & {
  updateStubs: (storage: Storage) => void;
  chooseSlot: (index: number) => void;
  unselectChosenSlot: () => void;
  startCloseAction: () => void;
  endCloseAction: () => void;
  startAction: (action: Tag) => void;
  endAction: () => void;
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
  startAction: (action: Tag) => {
    update((stack) => {
      const [stubs, selectedIndex] = <SlotSelected>stack;
      return [stubs, selectedIndex, action];
    });
  },
  endAction: () =>
    update((stack) => {
      const [stubs] = <DialogOpen<Tag>>stack;
      return [stubs];
    }),
  startCloseAction: () =>
    update((stack) => {
      const [stubs] = <NoSelection>stack;
      return [stubs, "warn-discard-on-close"];
    }),
  endCloseAction: () =>
    update((stack) => {
      const [stubs] = <WarnBeforeClose>stack;
      return [stubs];
    }),
};
