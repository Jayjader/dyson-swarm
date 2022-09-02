import { derived, writable } from "svelte/store";

export type Clock = ({ mode: "play" } | { mode: "pause" }) & {
  speed: number;
  tick: number;
};

const clockData = writable<Clock>({ mode: "pause", speed: 1, tick: 0 });
export const clock = {
  ...derived(clockData, (data) => data),
  increment: () =>
    clockData.update((data) =>
      data.mode === "play"
        ? { mode: "play", speed: data.speed, tick: data.tick + 1 }
        : { mode: "pause", speed: data.speed, tick: data.tick }
    ),
  play: () =>
    clockData.update((data) => ({
      mode: "play",
      speed: data.speed,
      tick: data.tick,
    })),
  pause: () =>
    clockData.update((data) => ({
      mode: "pause",
      speed: data.speed,
      tick: data.tick,
    })),
  setSpeed: (newSpeed: number) =>
    clockData.update((data) => ({
      mode: data.mode,
      speed: newSpeed,
      tick: data.tick,
    })),
};
