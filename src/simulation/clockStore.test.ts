import { describe, expect, test, vitest } from "vitest";
import { makeClockStore } from "./clockStore";

test("clock store advances inner counter on outside delta", () => {
  const store = makeClockStore(1000, () => {}, { mode: "play" });
  store.outsideDelta(300);
  expect(store.counter.outsideMillisBeforeNextTick).toEqual(700);
});

test("clock store triggers sim tick callback when advancing by enough time", () => {
  let callback = vitest.fn();
  const store = makeClockStore(1000, callback, { mode: "play" });
  store.outsideDelta(1000);
  expect(callback).toHaveBeenCalledOnce();
});

describe("clock store doesn't leak time", () => {
  test("single overflow", () => {
    let callback = vitest.fn();
    const store = makeClockStore(600, callback, { mode: "play" });
    store.outsideDelta(850);
    expect(store.counter.outsideMillisBeforeNextTick).toEqual(
      1000 + (600 - 850),
    );
    expect(callback).toHaveBeenCalledOnce();
  });
  test("three overflows", () => {
    let callback = vitest.fn();
    const store = makeClockStore(600, callback, { mode: "play" });
    store.outsideDelta(2715);
    expect(store.counter.outsideMillisBeforeNextTick).toEqual(
      3000 + (600 - 2715),
    );
    expect(callback).toHaveBeenCalledTimes(3);
  });
});

describe("fundamental play/pause needs", () => {
  test("paused clock does not advance counter nor trigger callback when given an outside time delta", () => {
    let callback = vitest.fn();
    const store = makeClockStore(800, callback, {
      mode: "pause",
    });
    store.outsideDelta(1000);
    expect(store.counter.outsideMillisBeforeNextTick).toEqual(800);
    expect(callback).not.toHaveBeenCalled();
  });

  test("play->pause method", () => {
    const store = makeClockStore(800, () => {}, { mode: "play" });
    store.pause();
    store.subscribe(({ mode }) => {
      expect(mode).toEqual("pause");
    });
  });

  test("pause->play method", () => {
    const store = makeClockStore(800, () => {}, { mode: "pause" });
    store.play();
    store.subscribe(({ mode }) => {
      expect(mode).toEqual("play");
    });
  });
});

describe("interruptability/hard-lock/indirectly pausing by user actions", () => {
  test("interrupted clock does not advance internal countdown", () => {
    const callback = vitest.fn();
    const startingCountdown = 800;
    const store = makeClockStore(startingCountdown, callback, {
      mode: "play",
      isInterrupted: true,
    });
    store.outsideDelta(1000);
    expect(store.counter.outsideMillisBeforeNextTick).toEqual(
      startingCountdown,
    );
    expect(callback).not.toHaveBeenCalled();
  });
  describe("allow clock to be interrupted", () => {
    test("when paused", () => {
      const store = makeClockStore(800, () => {}, { mode: "pause" });
      store.interrupt();
      store.subscribe(({ isInterrupted }) => {
        expect(isInterrupted).toBeTruthy();
      });
    });
    test("when playing", () => {
      const store = makeClockStore(800, () => {}, { mode: "play" });
      store.interrupt();
      store.subscribe(({ isInterrupted }) => {
        expect(isInterrupted).toBeTruthy();
      });
    });
  });

  describe("allow clock to be resumed when previously interrupted", () => {
    test("when paused", () => {
      const store = makeClockStore(800, () => {}, { mode: "pause" });
      store.interrupt();
      store.resume();
      store.subscribe(({ isInterrupted }) => {
        expect(isInterrupted).toBeFalsy();
      });
    });
    test("when playing", () => {
      const store = makeClockStore(800, () => {}, { mode: "play" });
      store.interrupt();
      store.resume();
      store.subscribe(({ isInterrupted }) => {
        expect(isInterrupted).toBeFalsy();
      });
    });
  });

  describe("toggling back and forth repeatedly should work", () => {
    test.each(["play", "pause"] as const)(
      "ending interrupted while in %s",
      (mode) => {
        const store = makeClockStore(800, () => {}, { mode });
        store.interrupt();
        store.resume();
        store.interrupt();
        store.subscribe(({ isInterrupted }) => {
          expect(isInterrupted).toBeTruthy();
        });
      },
    );
    test.each(["play", "pause"] as const)(
      "ending not interrupted while in %s",
      (mode) => {
        const store = makeClockStore(800, () => {}, { mode });
        store.interrupt();
        store.resume();
        store.interrupt();
        store.resume();
        store.subscribe(({ isInterrupted }) => {
          expect(isInterrupted).toBeFalsy();
        });
      },
    );
  });
});
