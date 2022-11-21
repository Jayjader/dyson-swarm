import type { Event, Events } from "../events";
import { Resource } from "../../gameStateStore";
import type { SubscriptionsFor } from "../index";
import type { EventProcessor } from "./index";

export type PowerGrid = EventProcessor<
  "power grid",
  {
    stored: number;
    breakerTripped: boolean;
    received: Events<
      Exclude<SubscriptionsFor<"power grid">, "simulation-clock-tick">
    >[];
  }
>;

export function createPowerGrid(
  id: PowerGrid["id"] = "power grid-0"
): PowerGrid {
  return {
    id,
    incoming: [],
    tag: "power grid",
    data: {
      stored: 0,
      breakerTripped: false,
      received: [],
    },
  };
}

export function powerGridProcess(grid: PowerGrid): [PowerGrid, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = grid.incoming.shift())) {
    switch (event.tag) {
      case "produce":
      case "draw":
        if (event.resource === Resource.ELECTRICITY) {
          grid.data.received.push(event);
          grid.data.received.sort((a, b) => a.receivedTick - b.receivedTick);
        }
        break;
      case "simulation-clock-tick":
        const [produced, toSupply] = grid.data.received.reduce(
          (accu, next) =>
            next.tag === "produce"
              ? [accu[0] + next.amount, accu[1]]
              : [accu[0], accu[1].add(next)],
          [0, new Set<Events<"draw">>()]
        );
        grid.data.stored += produced;
        const totalRequestedSupply = Array.from(toSupply).reduce(
          (accu, next) => accu + next.amount,
          0
        );
        if (grid.data.stored >= totalRequestedSupply) {
          grid.data.stored -= totalRequestedSupply;
          for (let drawRequest of toSupply) {
            emitted.push({
              tag: "supply",
              resource: Resource.ELECTRICITY,
              amount: drawRequest.amount,
              receivedTick: event.tick + 1,
              toId: drawRequest.forId,
            });
          }
        }
        grid.data.received = [];
        break;
    }
  }
  return [grid, emitted];
}
