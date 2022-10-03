import { derived, writable } from "svelte/store";

type Primitive = {
  speed: number;
  tick: number;
};
export type Play = [Primitive];
export type Pause = ["pause", Primitive];
export type IndirectPause = ["indirect-pause", Primitive];
export type Clock = Play | Pause | IndirectPause;
export function isPlay(c: Clock): c is Play {
  return c.length === 1;
}
export function isPause(c: Clock): c is Pause {
  return c[0] === "pause";
}
export function isIndirectPause(c: Clock): c is IndirectPause {
  return c[0] === "indirect-pause";
}

export function getPrimitive(c: Clock): Primitive {
  return (c.slice(-1) as Play)[0];
}
export function setPrimitive(c: Clock, p: Primitive): Clock {
  return c.splice(-1, 1, p) as Clock;
}

const clockData = writable<Clock>(["pause", { speed: 1, tick: 0 }]);
export const clock = {
  ...derived(clockData, (data) => data),
  increment: () =>
    // TODO: investigate allowing to increment by several ticks at once; will need to persist tick count pre-increment for game engine to properly catch up
    clockData.update((data) =>
      isPlay(data)
        ? [{ mode: "play", speed: data[0].speed, tick: data[0].tick + 1 }]
        : data
    ),
  play: () => clockData.update((data) => (isPause(data) ? [data[1]] : data)),
  pause: () =>
    clockData.update((data) => (isPlay(data) ? ["pause", data[0]] : data)),
  setSpeed: (newSpeed: number) =>
    clockData.update((data) =>
      isPlay(data)
        ? [{ tick: data[0].tick, speed: newSpeed }]
        : [
            data[0],
            {
              tick: data[1].tick,
              speed: newSpeed,
            },
          ]
    ),
  startIndirectPause: () =>
    clockData.update((data) =>
      isPlay(data) ? ["indirect-pause", data[0]] : data
    ),
  stopIndirectPause: () =>
    clockData.update((data) => (isIndirectPause(data) ? [data[1]] : data)),
};
