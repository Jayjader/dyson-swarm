import type { Readable, Writable } from "svelte/types/runtime/store";
import { derived, writable } from "svelte/store";
import type { BuildOrder, GameAction, SingleBuildOrder } from "../types";
import { Building, isAuto } from "../types";
import { build, canBuild, constructionCosts } from "../actions";

const queueData: Writable<Array<BuildOrder>> = writable([
  { building: Building.MINER, count: 3 },
  { building: Building.REFINERY },
  { building: Building.SOLAR_COLLECTOR, auto: true },
]);
type Actions = {
  push: (bo: BuildOrder) => void;
  pop: () => undefined | BuildOrder;
  clear: (options?: { onlyAuto: boolean }) => void;
};
export const buildQueue: Actions & Readable<Array<BuildOrder>> = {
  ...derived(queueData, (data) => data),
  push: (bo) =>
    queueData.update((value) => {
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
    }),
  pop: () => {
    let retVal;
    queueData.update(([head, ...tail]) => {
      retVal = head;
      if (head && isAuto(head)) {
        retVal = { building: head.building };
        return [head, ...tail];
      }
      return tail;
    });
    return retVal;
  },
  clear: ({ onlyAuto } = { onlyAuto: false }) => {
    if (onlyAuto) {
      queueData.update((previous) => previous.filter((bo) => !isAuto(bo)));
    } else {
      queueData.set([]);
    }
  },
};
export const currentJob = writable<null | SingleBuildOrder>(null);
type Exposed = Readable<{
  head: null | BuildOrder;
  auto: null | Building;
  work: (state) => void | GameAction;
}>;

export const store: Exposed = derived(
  [buildQueue, currentJob],
  ([queue, job]) => ({
    head: queue?.[0] ?? null,
    auto: queue.find((bo) => isAuto(bo))?.building ?? null,
    job,
    work: (resources) => {
      if (job) {
        console.debug({ job });
        if (canBuild(constructionCosts[job.building], resources)) {
          console.debug("building...");
          currentJob.set(null);
          return build(job.building);
        }
      } else {
        currentJob.set(buildQueue.pop());
      }
    },
  })
);
