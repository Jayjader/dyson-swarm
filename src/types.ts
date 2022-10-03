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
