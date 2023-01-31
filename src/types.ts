import type { Construct } from "./gameRules";
import { clone } from "./panels/fabricator/store";

export type BuildChoice = null | Construct;

export type Repeat = {
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

export function popNextConstruct([head, ...tail]: BuildOrder[]): [
  null | Construct,
  BuildOrder[]
] {
  if (!head || !isRepeat(head)) {
    return [head?.building ?? null, tail];
  }
  if (head.count === 2) {
    const [repeatHead, repeatTail] = popNextConstruct([
      ...clone(head.repeat),
      ...head.repeat,
    ]);
    return [repeatHead, [...repeatTail, ...tail]];
  }
  const [repeatHead, repeatTail] = popNextConstruct(head.repeat);
  return [
    repeatHead,
    [...repeatTail, { repeat: head.repeat, count: head.count - 1 }, ...tail],
  ];
}
