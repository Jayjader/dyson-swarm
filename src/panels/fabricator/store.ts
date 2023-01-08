import { derived, writable } from "svelte/store";
import type { BuildOrder } from "../../types";
import type { Construct } from "../../gameRules";

/* UI */
type EditInTime = { queue: BuildOrder[] };
type EditState = {
  past: Array<EditInTime>;
  present: EditInTime;
  future: Array<EditInTime>;
};
type AddBuildMode = { mode: "add-build-order"; remain: boolean };
type RemoveBuildMode = { mode: "remove-build-order"; remain: boolean };
type UiStateStack =
  | []
  | [EditState]
  | [AddBuildMode, EditState]
  | [RemoveBuildMode, EditState];
const isEditState = (stackItem: UiStateStack[0 | 1]): stackItem is EditState =>
  Array.isArray((stackItem as EditState)?.present?.queue);
const isAddBuildMode = (
  stackItem: UiStateStack[0 | 1]
): stackItem is AddBuildMode =>
  (stackItem as AddBuildMode)?.mode === "add-build-order";
const isRemoveBuildMode = (
  stackItem: UiStateStack[0 | 1]
): stackItem is RemoveBuildMode =>
  (stackItem as RemoveBuildMode)?.mode === "remove-build-order";

const uiStateStack = writable<UiStateStack>([]);
export const mode = derived<
  typeof uiStateStack,
  "read-only" | "edit" | "add-build-order" | "remove-build-order"
>(uiStateStack, (stack) => {
  const [head] = stack;
  if (!head) return "read-only";
  if (isEditState(head)) return "edit";
  return head.mode;
});
export const uiState = {
  ...derived(uiStateStack, (stack) => stack),
  enterEdit: (queue: BuildOrder[]) => {
    uiStateStack.set([{ future: [], past: [], present: { queue } }]);
  },
  cancelEdits: () => uiStateStack.set([]),
  saveEdits: (): BuildOrder[] => {
    let newQueue: BuildOrder[] = [];
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (isEditState(head)) {
        newQueue = head.present.queue;
      } else {
        const [_, tail] = stack;
        newQueue = tail?.present.queue ?? [];
      }
      return [];
    });
    return newQueue;
  },
  undoEdit: () =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (!isEditState(head)) return stack;
      const future: EditInTime[] = Array.from(head.future);
      future.push(head.present);
      const past: EditInTime[] = Array.from(head.past);
      const present = past.pop() ?? { queue: [] };
      return [{ future, past, present }];
    }),
  redoEdit: () =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (!isEditState(head)) return stack;
      if (head.future.length === 0) return stack;
      const past: EditInTime[] = Array.from(head.past);
      past.push(head.present);
      const future: EditInTime[] = Array.from(head.future);
      const present = future.pop() ?? { queue: [] };
      return [{ future, past, present }];
    }),
  enterAddBuildOrder: () =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (!isEditState(head)) return stack;
      return [{ mode: "add-build-order", remain: false }, head];
    }),
  toggleRemain: () =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (!isAddBuildMode(head)) return stack;
      return [
        { mode: "add-build-order", remain: !head.remain },
        stack[1] as EditState,
      ];
    }),
  cancelAddBuildOrder: () =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (!isAddBuildMode(head)) return stack;
      return [stack[1] as EditState];
    }),
  selectNewBuildOrder: (building: Construct) =>
    uiStateStack.update((stack) => {
      const [first] = stack;
      if (isAddBuildMode(first)) {
        const [, second] = stack;
        const past: EditInTime[] = Array.from(second?.past ?? []);
        const queue: BuildOrder[] = Array.from(second?.present.queue ?? []);
        if (second !== undefined) {
          past.push(second.present);
        }
        queue.push({ building });
        return [{ future: [], present: { queue }, past }];
      } else {
        return stack;
      }
    }),
  clearQueue: () =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (!isEditState(head)) return stack;
      const past = Array.from<EditInTime>(head.past);
      past.push(head.present);
      return [{ future: [], present: { queue: [] }, past }];
    }),
  enterRemoveBuildOrder: () =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      return isEditState(head)
        ? [{ mode: "remove-build-order", remain: false }, head]
        : stack;
    }),
  cancelRemoveBuildOrder: () =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (!isRemoveBuildMode(head)) return stack;
      return [stack[1] as EditState];
    }),
  removeBuildOrder: (index: number) =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (!isRemoveBuildMode(head)) return stack;
      const second = stack[1] as EditState;
      const past = Array.from<EditInTime>(second.past);
      const queue = Array.from<BuildOrder>(second.present.queue);
      past.push(second.present);
      queue.splice(index, 1);
      return [{ future: [], past, present: { queue } }];
    }),
};
