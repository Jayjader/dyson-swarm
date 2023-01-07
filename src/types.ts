import type { Construct, Resource } from "./gameStateStore";

export type Input = Map<Resource, number>;
export type BuildChoice = null | Construct;

export type Time = "play" | "pause";
export type SwarmHUD = {
  satellites: number;
};
type Repeat = {
  count: number;
  repeat: [BuildOrder, ...BuildOrder[]];
};
export type BuildOrder = SingleBuildOrder | Repeat;

export function isRepeat(bo: BuildOrder): bo is Repeat {
  return (bo as Repeat).repeat !== undefined;
}
export function isInfinite(
  bo: BuildOrder
): bo is Repeat & { count: typeof Number.POSITIVE_INFINITY } {
  return isRepeat(bo) && !Number.isFinite(bo.count);
}

export type SingleBuildOrder = {
  building: Construct;
};

// huge thanks to https://fettblog.eu/typescript-array-includes/
export function includes<T extends U, U>(
  collection: ReadonlySet<T>,
  element: U
): element is T {
  return collection.has(element as T);
}

export function popQueue([head, ...tail]: BuildOrder[]): [
  null | Construct,
  BuildOrder[]
] {
  if (!head || !isRepeat(head)) {
    return [head?.building ?? null, tail];
  }
  const [repeatHead, repeatTail] = popQueue(head.repeat);
  return head.count <= 1
    ? [repeatHead, [...repeatTail, ...tail]]
    : [
        repeatHead,
        [
          ...repeatTail,
          { repeat: head.repeat, count: head.count - 1 },
          ...tail,
        ],
      ];
  // if (queue.length === 0) {
  //   return [null, []];
  // }
  // const top = queue[0];
  // if (isRepeat(top)) {
  //   (queue[0] as Repeat).count -= 1;
  //   const [innerTop, innerRest] = popQueue(top.repeat);
  //   queue.unshift(...innerRest);
  //   return [innerTop, queue];
  // } else {
  //   const job = (queue.pop()! as SingleBuildOrder).building;
  //   return [job, queue];
  // }
}
