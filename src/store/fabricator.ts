import type { Readable } from "svelte/types/runtime/store";
import { derived, writable } from "svelte/store";
import type { BuildOrder, GameAction, SingleBuildOrder } from "../types";
import { isRepeat } from "../types";
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
  head: null | BuildOrder;
  work: (state) => void | GameAction;
}>;

export const store: Exposed = derived(
  [buildQueue, currentJob],
  ([queue, job]) => ({
    head: queue?.[0] ?? null,
    job,
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
