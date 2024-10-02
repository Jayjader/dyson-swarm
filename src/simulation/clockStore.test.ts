import { expect, test } from "vitest";
import { testStore } from "./clockStore";

test("clock store advances inner counter on outside delta", () => {
  const store = testStore.withMillisBeforeNextTick(1000);
  store.outsideDelta(300);
  expect(store.state.outsideMillisBeforeNextTick).toEqual(700);
});
