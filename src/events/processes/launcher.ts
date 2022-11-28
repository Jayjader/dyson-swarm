import type { Event, Events } from "../events";
import type { EventProcessor } from "./index";
import type { SubscriptionsFor } from "../index";
import { Resource, tickConsumption } from "../../gameStateStore";

export type Launcher = EventProcessor<
  "launcher",
  {
    working: boolean;
    charge: number;
    received: Events<
      Exclude<SubscriptionsFor<"factory">, "simulation-clock-tick">
    >[];
  }
>;
export function createLauncher(id: Launcher["id"] = "launcher-0"): Launcher {
  return {
    id,
    tag: "launcher",
    incoming: [],
    data: { working: true, charge: 0, received: [] },
  };
}
export function launcherProcess(launcher: Launcher): [Launcher, Event[]] {
  let event;
  let emitted = [] as Event[];
  while ((event = launcher.incoming.shift())) {
    switch (event.tag) {
      case "supply":
        if (event.toId === launcher.id) {
          launcher.data.received.push(event);
        }
        break;
      case "simulation-clock-tick":
        const [totalPower, satellites] = launcher.data.received.reduce(
          (accu, e) => {
            if (e.resource === Resource.ELECTRICITY) {
              return [accu[0] + e.amount, accu[1]];
            }
            if (e.resource === Resource.PACKAGED_SATELLITE) {
              accu[1].push(e);
            }
            return accu;
          },
          [0, [] as Events<"supply">[]]
        );
        launcher.data.charge += totalPower;
        if (
          launcher.data.charge <
          tickConsumption.launcher.get(Resource.ELECTRICITY)!
        ) {
          emitted.push({
            tag: "draw",
            resource: Resource.ELECTRICITY,
            amount: tickConsumption.launcher.get(Resource.ELECTRICITY)!,
            forId: launcher.id,
            receivedTick: event.tick + 1,
          });
        } else {
          if (satellites.length > 0) {
            satellites.shift();
            launcher.data.received = satellites;
            emitted.push({
              tag: "launch-satellite",
              receivedTick: event.tick + 1,
            });
          } else {
            emitted.push({
              tag: "draw",
              resource: Resource.PACKAGED_SATELLITE,
              amount: tickConsumption.launcher.get(
                Resource.PACKAGED_SATELLITE
              )!,
              forId: launcher.id,
              receivedTick: event.tick + 1,
            });
          }
        }
        break;
    }
  }
  return [launcher, emitted];
}
