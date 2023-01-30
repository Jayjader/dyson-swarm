import { derived, writable } from "svelte/store";
import type { BuildOrder, Repeat } from "../../types";
import type { Construct } from "../../gameRules";
import { isRepeat } from "../../types";

type PositionInQueue = [number, ...number[]];

/* UI */
type EditInTime = { queue: BuildOrder[] };
type EditState = {
  past: Array<EditInTime>;
  present: EditInTime;
  future: Array<EditInTime>;
};
type AddBuildMode = { mode: "add-build-order"; remain: boolean };
type RemoveBuildMode = { mode: "remove-build-order"; remain: boolean };
type RemoveRepeatMode = { mode: "remove-repeat-order"; remain: boolean };
type UnwrapRepeatMode = { mode: "unwrap-repeat-order"; remain: boolean };
type UiStateStack =
  | []
  | [EditState]
  | [AddBuildMode, EditState]
  | [RemoveRepeatMode, EditState]
  | [UnwrapRepeatMode, EditState]
  | [RemoveBuildMode, EditState];
export const isEditState = (
  stackItem: UiStateStack[0 | 1]
): stackItem is EditState =>
  Array.isArray((stackItem as EditState)?.present?.queue);
const isAddBuildMode = (
  stackItem: UiStateStack[0 | 1]
): stackItem is AddBuildMode =>
  (stackItem as AddBuildMode)?.mode === "add-build-order";
const isRemoveBuildMode = (
  stackItem: UiStateStack[0 | 1]
): stackItem is RemoveBuildMode =>
  (stackItem as RemoveBuildMode)?.mode === "remove-build-order";
const isRemoveRepeatMode = (
  stackItem: UiStateStack[0 | 1]
): stackItem is RemoveRepeatMode =>
  (stackItem as RemoveRepeatMode)?.mode === "remove-repeat-order";
const isUnwrapRepeatMode = (
  stackItem: UiStateStack[0 | 1]
): stackItem is UnwrapRepeatMode =>
  (stackItem as UnwrapRepeatMode)?.mode === "unwrap-repeat-order";

function clone(orders: BuildOrder[]): BuildOrder[] {
  return orders.map(
    (order) =>
      (isRepeat(order)
        ? { count: order.count, repeat: clone(order.repeat) }
        : order) as BuildOrder
  );
}
export function makeBuildQueueUiStore() {
  const uiStateStack = writable<UiStateStack>([]);
  const mode = derived<
    typeof uiStateStack,
    | "read-only"
    | "edit"
    | "add-build-order"
    | "remove-build-order"
    | "remove-repeat-order"
    | "unwrap-repeat-order"
  >(uiStateStack, (stack) => {
    const [head] = stack;
    if (!head) return "read-only";
    if (isEditState(head)) return "edit";
    return head.mode;
  });
  const uiState = {
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
    removeBuildOrder: (position: PositionInQueue) =>
      uiStateStack.update((stack) => {
        const [head] = stack;
        if (!isRemoveBuildMode(head)) return stack;
        const second = stack[1] as EditState;
        const past = Array.from<EditInTime>(second.past);
        past.push(second.present);
        function deleteBuildOrderAt(
          p: PositionInQueue,
          queue: BuildOrder[]
        ): BuildOrder[] {
          const [index, next, ...rest] = p;
          if (next === undefined) {
            queue.splice(index, 1);
            return queue;
          } else {
            deleteBuildOrderAt(
              [next, ...rest],
              (queue[index] as Repeat).repeat
            );
            return queue;
          }
        }
        const queue = deleteBuildOrderAt(position, clone(second.present.queue));
        return [{ future: [], past, present: { queue } }];
      }),
    enterRemoveRepeatOrder: () =>
      uiStateStack.update((stack) => {
        const [head] = stack;
        return isEditState(head)
          ? [{ mode: "remove-repeat-order", remain: false }, head]
          : stack;
      }),
    cancelRemoveRepeatOrder: () =>
      uiStateStack.update((stack) => {
        const [head] = stack;
        if (!isRemoveRepeatMode(head)) return stack;
        return [stack[1] as EditState];
      }),
    removeRepeatOrder: (position: PositionInQueue) =>
      uiStateStack.update((stack) => {
        const [head] = stack;
        if (!isRemoveRepeatMode(head)) return stack;
        const second = stack[1] as EditState;
        const past = Array.from<EditInTime>(second.past);
        past.push(second.present);

        function deleteRepeatOrderAt(
          p: PositionInQueue,
          queue: BuildOrder[]
        ): BuildOrder[] {
          const [index, next, ...rest] = p;
          if (next === undefined) {
            queue.splice(index, 1);
            return queue;
          } else {
            deleteRepeatOrderAt(
              [next, ...rest],
              (queue[index] as Repeat).repeat
            );
            return queue;
          }
        }
        const queue = deleteRepeatOrderAt(
          position,
          clone(second.present.queue)
        );
        return [{ future: [], past, present: { queue } }];
      }),
    enterUnwrapRepeatOrder: () =>
      uiStateStack.update((stack) => {
        const [head] = stack;
        return isEditState(head)
          ? [{ mode: "unwrap-repeat-order", remain: false }, head]
          : stack;
      }),
    cancelUnwrapRepeatOrder: () =>
      uiStateStack.update((stack) => {
        const [head] = stack;
        if (!isUnwrapRepeatMode(head)) return stack;
        return [stack[1] as EditState];
      }),
    unwrapRepeatOrder: (position: PositionInQueue) =>
      uiStateStack.update((stack) => {
        const [head] = stack;
        if (!isUnwrapRepeatMode(head)) return stack;
        const second = stack[1] as EditState;
        const past = Array.from<EditInTime>(second.past);
        past.push(second.present);

        function unwrapRepeatOrderAt(
          p: PositionInQueue,
          queue: BuildOrder[]
        ): BuildOrder[] {
          const [index, next, ...rest] = p;
          if (next === undefined) {
              console.debug({beforeSplice: clone(queue)})
            queue.splice(index, 1, ...(queue[index] as Repeat).repeat);
            console.debug({afterSplice: queue})
            return queue;
          } else {
            unwrapRepeatOrderAt(
              [next, ...rest],
              (queue[index] as Repeat).repeat
            );
            return queue;
          }
        }
        const queue = unwrapRepeatOrderAt(
          position,
          clone(second.present.queue)
        );
        return [{ future: [], past, present: { queue } }];
      }),
  };
  return [uiState, mode] as const;
}
export const BUILD_QUEUE_STORE = Symbol("build queue store");
