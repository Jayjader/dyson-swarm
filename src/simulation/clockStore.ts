import { writable } from "svelte/store";

type ClockState = { outsideMillisBeforeNextTick: number };
interface ClockStore {
  outsideDelta(delta: number): void;
}
export function makeClockStore(callback: () => void): ClockStore {
  const { update } = writable<ClockState>({ outsideMillisBeforeNextTick: 0 });
  return {
    outsideDelta(delta: number) {
      update((state) => outsideDelta(state, delta));
    },
  };
}

function outsideDelta(state: ClockState, delta: number) {
  state.outsideMillisBeforeNextTick -= delta;
  return state;
}

export const testStore = {
  withMillisBeforeNextTick: (
    millis: number,
  ): { state: ClockState } & ClockStore => {
    let state = { outsideMillisBeforeNextTick: millis };
    return {
      state,
      outsideDelta: (delta: number) => {
        state = outsideDelta(state, delta);
      },
    };
  },
} as const;
