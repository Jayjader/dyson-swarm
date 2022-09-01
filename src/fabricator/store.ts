import type { Readable } from "svelte/types/runtime/store";
import { derived, writable } from "svelte/store";
import type { BuildOrder, GameAction, SingleBuildOrder } from "../types";
import { Building, isRepeat } from "../types";
import { build, canBuild, constructionCosts } from "../actions";

const queueData = writable<BuildOrder[]>([]);
type Actions = {
  push: (bo: BuildOrder) => void;
  pop: () => undefined | SingleBuildOrder;
  clear: (options?: { onlyAuto: boolean }) => void;
  replace: (newData: BuildOrder[]) => void;
};
export const buildQueue: Actions & Readable<Array<BuildOrder>> = {
  ...derived(queueData, (data) => data),
  push: (bo) => queueData.update((value) => [...value, bo]),
  pop: () => {
    let poppedValue;
    queueData.update(([head, ...tail]) => {
      if (!head || !isRepeat(head)) {
        poppedValue = head;
        return tail;
      } else {
        const [repeatHead, ...repeatTail] = head.repeat;
        poppedValue = repeatHead;
        return head.count <= 1
          ? [...repeatTail, ...tail]
          : [
              ...repeatTail,
              { repeat: head.repeat, count: head.count - 1 },
              ...tail,
            ];
      }
    });
    return poppedValue;
  },
  clear: () => queueData.set([]),
  replace: (newData) => queueData.set(newData),
};
export const currentJob = writable<undefined | SingleBuildOrder>();
type Exposed = Readable<{
  work: (state) => void | GameAction;
}>;

export const fabricator: Exposed = derived(
  [buildQueue, currentJob],
  ([, job]) => ({
    work: (resources) => {
      if (!job) {
        currentJob.set(buildQueue.pop());
      }
      if (job && canBuild(constructionCosts[job.building], resources)) {
        currentJob.set(undefined);
        return build(job.building);
      }
    },
  })
);

/* UI */
type EditInTime = { queue: BuildOrder[] };
type EditState = {
  past: Array<EditInTime>;
  present: EditInTime;
  future: Array<EditInTime>;
};
type AddBuildMode = { mode: "add-build-order"; remain: boolean };
type UiStateStack =
  | []
  | [EditState]
  | [AddBuildMode, EditState]
  | ["remove-build-order", EditState];
function isEditState(
  stackItem: undefined | EditState | AddBuildMode | "remove-build-order"
): stackItem is EditState {
  return Array.isArray((stackItem as EditState)?.present?.queue);
}
function isAddBuildMode(
  stackItem: undefined | EditState | AddBuildMode | "remove-build-order"
): stackItem is AddBuildMode {
  return (stackItem as AddBuildMode)?.mode === "add-build-order";
}

const uiStateStack = writable<UiStateStack>([]);
export const mode = derived<
  typeof uiStateStack,
  "read-only" | "edit" | "add-build-order" | "remove-build-order"
>(uiStateStack, (stack) => {
  const [head] = stack;
  if (!head) return "read-only";
  if (isEditState(head)) return "edit";
  if ((head as AddBuildMode)?.mode === "add-build-order")
    return "add-build-order";
  if (head === "remove-build-order") return "remove-build-order";
});
export const uiState = {
  ...derived(uiStateStack, (stack) => stack),
  enterEdit: (queue: BuildOrder[]) => {
    uiStateStack.set([{ future: [], past: [], present: { queue } }]);
  },
  cancelEdits: () => uiStateStack.set([]),
  saveEdits: () =>
    uiStateStack.update((stack) => {
      const [head] = stack;
      if (isEditState(head)) buildQueue.replace(head.present.queue);
      return [];
    }),
  undoEdit: () =>
    uiStateStack.update(([first, second]) => {
      if (isEditState(first)) {
        const future: EditInTime[] = Array.from(first.future);
        future.push(first.present);
        const past: EditInTime[] = Array.from(first.past);
        const present = past.pop();
        return [{ future, past, present }];
      } else {
        return [first, second];
      }
    }),
  redoEdit: () =>
    uiStateStack.update(([first, second]) => {
      if (isEditState(first)) {
        const past: EditInTime[] = Array.from(first.past);
        past.push(first.present);
        const future: EditInTime[] = Array.from(first.future);
        const present = future.pop();
        return [{ future, past, present }];
      } else {
        return [first, second];
      }
    }),
  enterAddBuildOrder: () =>
    uiStateStack.update(([first, second]) =>
      isEditState(first)
        ? [{ mode: "add-build-order", remain: false }, first]
        : [first, second]
    ),
  toggleRemain: () =>
    uiStateStack.update(([first, second]) => {
      if (isAddBuildMode(first)) {
        return [{ mode: "add-build-order", remain: !first.remain }, second];
      } else {
        return isEditState(first) ? [first] : [first, second];
      }
    }),
  cancelAddBuildOrder: () =>
    uiStateStack.update(([first, second]) => {
      if (isAddBuildMode(first)) {
        return [second];
      } else {
        return isEditState(first) ? [first] : [first, second];
      }
    }),
  selectNewBuildOrder: (building: Building) =>
    uiStateStack.update((stack) => {
      const [first] = stack;
      if (isAddBuildMode(first)) {
        const [, second] = stack;
        const past: EditInTime[] = Array.from(second.past);
        const queue: BuildOrder[] = Array.from(second.present.queue);
        past.push(second.present);
        queue.push({ building });
        return [{ future: [], present: { queue }, past }];
      } else {
        return stack;
      }
    }),
  clearQueue: () =>
    uiStateStack.update(([first, second]) => {
      if (isEditState(first)) {
        const past = Array.from<EditInTime>(first.past);
        past.push(first.present);
        return [{ future: [], present: { queue: [] }, past }];
      } else {
        return first === undefined ? [] : [first, second];
      }
    }),
  enterRemoveBuildOrder: () =>
    uiStateStack.update(([first, second]) =>
      isEditState(first) ? ["remove-build-order", first] : [first, second]
    ),
  cancelRemoveBuildOrder: () =>
    uiStateStack.update(([first, second]) => {
      if (first === "remove-build-order") {
        return [second];
      } else {
        return isEditState(first) ? [first] : [first, second];
      }
    }),
  removeBuildOrder: (index: number) =>
    uiStateStack.update(([first, second]) => {
      if (first === "remove-build-order") {
        const past = Array.from<EditInTime>(second.past);
        const queue = Array.from<BuildOrder>(second.present.queue);
        past.push(second.present);
        queue.splice(index, 1);
        return [{ future: [], past, present: { queue } }];
      } else {
        return isEditState(first) ? [] : [first, second];
      }
    }),
};
