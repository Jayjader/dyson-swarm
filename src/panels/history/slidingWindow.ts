import { writable } from "svelte/store";

type Point = [number, number | bigint];
export function createWindowStore() {
  const windowConfig = { windowStart: 0, windowSize: 100 };
  const { subscribe, update, set } = writable(new Map<string, Point[]>());
  return {
    windowConfig,
    subscribe,
    pushPoint(category: string, point: [number, number | bigint]) {
      update((map) => {
        const points = map.get(category);
        if (points === undefined) {
          map.set(category, [point]);
        } else {
          if (points.length >= windowConfig.windowSize) {
            points.shift();
          }
          points.push(point);
        }
        return map;
      });
    },
  };
}
