import type { Readable, Writable } from "svelte/types/runtime/store";
import { derived, writable } from "svelte/store";
import type { BuildOrder } from "../types";
import { Building, isAuto } from "../types";

export const data: Writable<Array<BuildOrder>> = writable([]);
type Actions = {
  push: (bo: BuildOrder) => void;
  pop: () => BuildOrder;
  clear: (options?: { onlyAuto: boolean }) => void;
};
const pushBuildOrder = (bo) =>
  data.update((value) => {
    if (value.length === 0) {
      return [bo];
    }
    if (isAuto(bo)) {
      value = value.filter((bo_) => !isAuto(bo_));
      return [...value, bo];
    } else {
      if (isAuto(value.slice(-1)[0])) {
        return [...value.slice(0, -1), bo, ...value.slice(-1)];
      }
      return [...value, bo];
    }
  });
const popBuildOrder = () => {
  let retVal;
  data.update(([head, ...tail]) => {
    retVal = head;
    if (isAuto(head)) {
      return [head, ...tail];
    }
    return tail;
  });
  return retVal;
};
const clearBuildQueue = ({ onlyAuto } = { onlyAuto: false }) => {
  if (onlyAuto) {
    data.update((previous) => previous.filter((bo) => !isAuto(bo)));
  } else {
    data.set([]);
  }
};
type Exposed = Readable<{ head: null | BuildOrder; auto: null | Building }>;
export const store: Exposed & Actions = {
  ...derived([data], ([queue]) => ({
    head: queue?.[0] ?? null,
    auto: queue.find((bo) => isAuto(bo))?.building ?? null,
  })),
  push: pushBuildOrder,
  pop: popBuildOrder,
  clear: clearBuildQueue,
};
