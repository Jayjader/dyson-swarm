import { writable } from "svelte/store";

type Primitive = {
  speed: number;
  tick: number;
};

type ClockCounter = { outsideMillisBeforeNextTick: number };
type ClockMode = "play" | "pause";
const clockDefaults = { mode: "pause", speed: 1, tick: 0 } as const;
const MILLISECONDS_IN_A_SECOND = 1_000;
export type ClockStore = ReturnType<typeof makeClockStore>;
export function makeClockStore(
  millisBeforeClockTick: number,
  simTickCallback: (tick: number) => void,
  options: Partial<
    Primitive & { mode: ClockMode; isInterrupted: boolean }
  > = {},
) {
  let counter: ClockCounter = {
    outsideMillisBeforeNextTick: millisBeforeClockTick,
  };
  const mode = options?.mode ?? clockDefaults.mode;
  const speed = options?.speed ?? clockDefaults.speed;
  const tick = options?.tick ?? clockDefaults.tick;
  const isInterrupted = options?.isInterrupted ?? false;
  const { subscribe, update } = writable({ mode, speed, tick, isInterrupted });
  return {
    subscribe,
    counter,
    outsideDelta(delta: number) {
      update((state) => {
        if (state.mode === "play" && !state.isInterrupted) {
          counter.outsideMillisBeforeNextTick -= delta * state.speed;
          while (counter.outsideMillisBeforeNextTick <= 0) {
            counter.outsideMillisBeforeNextTick += MILLISECONDS_IN_A_SECOND;
            state.tick += 1;
            console.debug(
              "clock store tick: ",
              state.tick,
              "; speed: ",
              state.speed,
            );
            simTickCallback(tick);
          }
        }
        return state;
      });
    },
    pause() {
      update((state) => {
        state.mode = "pause";
        return state;
      });
    },
    play() {
      update((state) => {
        state.mode = "play";
        return state;
      });
    },
    interrupt() {
      update((state) => {
        state.isInterrupted = true;
        return state;
      });
    },
    resume() {
      update((state) => {
        state.isInterrupted = false;
        return state;
      });
    },
    setSpeed(speed: number) {
      update((state) => {
        state.speed = speed;
        return state;
      });
    },
  };
}
