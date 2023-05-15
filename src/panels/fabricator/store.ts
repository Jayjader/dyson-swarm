import { writable } from "svelte/store";
import type { Construct } from "../../gameRules";
import type { BuildOrder, Repeat, SingleBuildOrder } from "../../types";
import { isRepeat } from "../../types";

type PositionInQueue = [number, ...number[]];

/* UI */
type EditInTime = { queue: BuildOrder[] };
type EditState = {
  past: Array<EditInTime>;
  present: EditInTime;
  future: Array<EditInTime>;
};
function insertNewOrder(
  order: SingleBuildOrder,
  position: PositionInQueue,
  queue: BuildOrder[],
  top = true
): [BuildOrder, ...BuildOrder[]] {
  const [head, ...tail] = position;
  if (tail.length === 0) {
    queue.splice(head, 0, order);
  } else {
    const repeat = queue[head] as Repeat;
    queue.splice(head, 1, {
      count: repeat.count,
      repeat: insertNewOrder(
        order,
        tail as PositionInQueue,
        repeat.repeat,
        false
      ),
    });
  }
  return queue as [BuildOrder, ...BuildOrder[]];
}
type AddBuildMode =
  | { mode: "add-build-select-position"; remain: boolean }
  | ({ mode: "add-build-select-construct"; remain: boolean } & {
      before: PositionInQueue;
    });
type AddRepeatMode =
  | { mode: "add-repeat-select-initial"; remain: boolean }
  | {
      mode: "add-repeat-select-final";
      initial: PositionInQueue;
      remain: boolean;
    }
  | {
      mode: "add-repeat-confirm";
      initial: PositionInQueue;
      final: PositionInQueue;
      remain: boolean;
    };
type RemoveBuildMode = { mode: "remove-build-order"; remain: boolean };
type RemoveRepeatMode = { mode: "remove-repeat-order"; remain: boolean };
type UnwrapRepeatMode = { mode: "unwrap-repeat-order"; remain: boolean };
type UiStateStack =
  | []
  | [EditState]
  | [AddBuildMode, EditState]
  | [AddRepeatMode, EditState]
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
  (stackItem as AddBuildMode)?.mode.startsWith("add-build");
const isAddRepeatMode = (
  stackItem: UiStateStack[0 | 1]
): stackItem is AddRepeatMode =>
  (stackItem as AddRepeatMode)?.mode?.startsWith("add-repeat");
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

export function stackMode(stack: UiStateStack) {
  const [head] = stack;
  if (!head) return "read-only";
  if (isEditState(head)) return "edit";
  return head.mode;
}

export function queryAt(p: PositionInQueue, queue: BuildOrder[]): BuildOrder {
  const [head, ...tail] = p;
  if (tail.length === 0) {
    return queue[head];
  }
  return queryAt(tail as PositionInQueue, (queue[head] as Repeat).repeat);
}
export function areSamePosition(a: PositionInQueue, b: PositionInQueue) {
  return (
    a.length === b.length && a.every((value, index) => b.at(index)! === value)
  );
}

export function areAtSameDepth(a: PositionInQueue, b: PositionInQueue) {
  return (
    a.length === b.length &&
    a
      .slice(0, -1)
      .every(
        (indexInQueue, indexInPosition) =>
          b.at(indexInPosition) === indexInQueue
      )
  );
}

export function clone(orders: BuildOrder[]): BuildOrder[] {
  return orders.map(
    (order) =>
      (isRepeat(order)
        ? { count: order.count, repeat: clone(order.repeat) }
        : { ...order }) as BuildOrder
  );
}
function unwrapRepeatOrderAt(
  p: PositionInQueue,
  queue: BuildOrder[]
): BuildOrder[] {
  const [index, next, ...rest] = p;
  if (next === undefined) {
    queue.splice(index, 1, ...(queue[index] as Repeat).repeat);
  } else {
    unwrapRepeatOrderAt([next, ...rest], (queue[index] as Repeat).repeat);
  }
  return queue;
}
function wrapRepeatOrderAt(
  from: PositionInQueue,
  to: PositionInQueue,
  queue: BuildOrder[]
): BuildOrder[] {
  const [fromIndex, ...fromRest] = from;
  const [toIndex, ...toRest] = to;
  if (fromRest.length === 0) {
    queue.splice(fromIndex, toIndex - fromIndex + 1, {
      count: 2,
      repeat: queue.slice(fromIndex, toIndex + 1) as Repeat["repeat"],
    });
  } else {
    wrapRepeatOrderAt(
      fromRest as PositionInQueue, // length > 0 checked above
      toRest as PositionInQueue, // is the same length
      (queue[fromIndex] as Repeat).repeat
    );
  }
  return queue;
}
export function makeBuildQueueUiStore() {
  const { subscribe, set, update } = writable<UiStateStack>([]);
  return {
    subscribe,
    enterEdit: (queue: BuildOrder[]) => {
      set([{ future: [], past: [], present: { queue } }]);
    },
    cancelEdits: () => set([]),
    saveEdits: (): BuildOrder[] => {
      let newQueue: BuildOrder[] = [];
      update((stack) => {
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
      update((stack) => {
        const [head] = stack;
        if (!isEditState(head)) return stack;
        const future: EditInTime[] = Array.from(head.future);
        future.push(head.present);
        const past: EditInTime[] = Array.from(head.past);
        const present = past.pop() ?? { queue: [] };
        return [{ future, past, present }];
      }),
    redoEdit: () =>
      update((stack) => {
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
      update((stack) => {
        const [head] = stack;
        if (!isEditState(head)) return stack;
        return [{ mode: "add-build-select-position", remain: false }, head];
      }),
    enterChooseConstructForNewBuildOrder: (position: {
      before: PositionInQueue;
    }) =>
      update((stack) => {
        const [head, ...tail] = stack;
        if (isEditState(head))
          return [
            { mode: "add-build-select-construct", ...position, remain: false },
            head,
          ];
        if (head?.mode === "add-build-select-position")
          return [
            {
              mode: "add-build-select-construct",
              ...position,
              remain: head.remain,
            },
            tail[0]!,
          ];
        return stack;
      }),
    toggleRemain: () =>
      update((stack) => {
        const [head, ...rest] = stack;
        if (!isAddBuildMode(head)) return stack;
        const [edit] = rest;
        return [{ ...head, remain: !head.remain }, edit!];
      }),
    cancelAddBuildOrder: () =>
      update((stack) => {
        const [head] = stack;
        if (!isAddBuildMode(head)) return stack;
        return [stack[1] as EditState];
      }),
    selectNewBuildOrder: (building: Construct) =>
      update((stack) => {
        const [head, ...tail] = stack;
        if (!isAddBuildMode(head) || head.mode !== "add-build-select-construct")
          return stack;
        const [edit] = tail;
        const past: EditInTime[] = Array.from(edit?.past ?? []);
        const queue: BuildOrder[] = clone(edit?.present.queue ?? []);
        if (edit !== undefined) {
          past.push(edit.present);
        }
        return [
          {
            future: [],
            present: {
              queue: insertNewOrder({ building }, head.before, queue),
            },
            past,
          },
        ];
      }),
    enterAddRepeatOrder: () =>
      update((stack) => {
        const [head] = stack;
        if (!isEditState(head)) return stack;
        return [{ mode: "add-repeat-select-initial", remain: false }, head];
      }),
    cancelAddRepeat: () =>
      update((stack) => {
        const [repeat, edit] = stack;
        if (!isAddRepeatMode(repeat)) return stack;
        if (repeat.mode === "add-repeat-confirm") {
          edit!.present = edit!.past.pop()!;
        }
        return [edit!];
      }),
    selectInitialForNewRepeat: (position: PositionInQueue) =>
      update((stack) => {
        const [repeat, edit] = stack;
        if (!isAddRepeatMode(repeat)) return stack;
        return [
          {
            mode: "add-repeat-select-final",
            initial: position,
            remain: repeat.remain,
          },
          edit!,
        ];
      }),
    changeSelection: () =>
      update((stack) => {
        const [repeat, edit] = stack;
        if (
          !isAddRepeatMode(repeat) ||
          repeat.mode === "add-repeat-select-initial"
        ) {
          return stack;
        }
        if (repeat.mode === "add-repeat-confirm") {
          edit!.present = edit!.past.pop()!;
        }
        return [
          { mode: "add-repeat-select-initial", remain: repeat.remain },
          edit!,
        ];
      }),
    selectFinalForNewRepeat: (position: PositionInQueue) =>
      update((stack) => {
        const [repeat, edit] = stack;
        if (
          !isAddRepeatMode(repeat) ||
          repeat.mode === "add-repeat-select-initial"
        )
          return stack;

        const sorted = repeat.initial.at(-1)! < position.at(-1)!;
        const initial = sorted ? repeat.initial : position;
        const final = !sorted ? repeat.initial : position;

        const past = Array.from<EditInTime>(edit!.past);
        past.push(edit!.present);
        const queue = wrapRepeatOrderAt(
          initial,
          final,
          clone(edit!.present.queue)
        );
        return [
          { mode: "add-repeat-confirm", final, initial, remain: repeat.remain },
          { future: [], present: { queue }, past },
        ];
      }),
    changeRepeatCount: (position: PositionInQueue, count: number) =>
      update((stack) => {
        const [head, ...rest] = stack;
        if (
          !head ||
          !isAddRepeatMode(head) ||
          head.mode !== "add-repeat-confirm"
        )
          return stack;
        const [edit] = rest;
        (queryAt(position, edit!.present.queue) as Repeat).count = count;
        return [head, edit!];
      }),
    confirmAddRepeat: () =>
      update((stack) => {
        const [repeat, edit] = stack;
        if (!isAddRepeatMode(repeat) || repeat.mode !== "add-repeat-confirm") {
          return stack;
        }
        return [edit!];
      }),
    clearQueue: () =>
      update((stack) => {
        const [head] = stack;
        if (!isEditState(head)) return stack;
        const past = Array.from<EditInTime>(head.past);
        past.push(head.present);
        return [{ future: [], present: { queue: [] }, past }];
      }),
    enterRemoveBuildOrder: () =>
      update((stack) => {
        const [head] = stack;
        return isEditState(head)
          ? [{ mode: "remove-build-order", remain: false }, head]
          : stack;
      }),
    cancelRemoveBuildOrder: () =>
      update((stack) => {
        const [head] = stack;
        if (!isRemoveBuildMode(head)) return stack;
        return [stack[1] as EditState];
      }),
    removeBuildOrder: (position: PositionInQueue) =>
      update((stack) => {
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
      update((stack) => {
        const [head] = stack;
        return isEditState(head)
          ? [{ mode: "remove-repeat-order", remain: false }, head]
          : stack;
      }),
    cancelRemoveRepeatOrder: () =>
      update((stack) => {
        const [head] = stack;
        if (!isRemoveRepeatMode(head)) return stack;
        return [stack[1] as EditState];
      }),
    removeRepeatOrder: (position: PositionInQueue) =>
      update((stack) => {
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
      update((stack) => {
        const [head] = stack;
        return isEditState(head)
          ? [{ mode: "unwrap-repeat-order", remain: false }, head]
          : stack;
      }),
    cancelUnwrapRepeatOrder: () =>
      update((stack) => {
        const [head] = stack;
        if (!isUnwrapRepeatMode(head)) return stack;
        return [stack[1] as EditState];
      }),
    unwrapRepeatOrder: (position: PositionInQueue) =>
      update((stack) => {
        const [head] = stack;
        if (!isUnwrapRepeatMode(head)) return stack;
        const second = stack[1] as EditState;
        const past = Array.from<EditInTime>(second.past);
        past.push(second.present);

        const queue = unwrapRepeatOrderAt(
          position,
          clone(second.present.queue)
        );
        return [{ future: [], past, present: { queue } }];
      }),
  };
}
export const BUILD_QUEUE_STORE = Symbol("build queue store");
