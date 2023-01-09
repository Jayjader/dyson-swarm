import type { BusEvent, Events } from "../events";
import type { EventProcessor } from "./index";
import type { Simulation, SubscriptionsFor } from "../index";
import { Construct, Resource, tickConsumption } from "../../gameRules";

export type LauncherManager = EventProcessor<
  "launcher",
  {
    working: number;
    count: number;
    charge: number;
    received: Events<
      Exclude<SubscriptionsFor<"factory">, "simulation-clock-tick">
    >[];
  }
>;
export function createLauncherManager(
  options: Partial<{ id: LauncherManager["id"]; count: number }> = {}
): LauncherManager {
  const values = {
    id: "launcher-0" as LauncherManager["id"],
    count: 0,
    ...options,
  };
  return {
    id: values.id,
    tag: "launcher",
    incoming: [],
    data: {
      working: values.count,
      count: values.count,
      charge: 0,
      received: [],
    },
  };
}
export function launcherProcess(
  launcher: LauncherManager
): [LauncherManager, BusEvent[]] {
  let event: BusEvent;
  let emitted = [] as BusEvent[];
  while ((event = launcher.incoming.shift()!)) {
    switch (event.tag) {
      case "command-set-working-count":
        if (event.construct === Construct.SATELLITE_LAUNCHER) {
          launcher.data.working = event.count;
          emitted.push({
            tag: "working-count-set",
            construct: Construct.SATELLITE_LAUNCHER,
            count: event.count,
            beforeTick: event.afterTick + 1,
          });
        }
        break;
      case "construct-fabricated":
        if (event.construct === Construct.SATELLITE_LAUNCHER) {
          launcher.data.received.push(event);
        }
        break;
      case "supply":
        if (event.toId === launcher.id) {
          launcher.data.received.push(event);
        }
        break;
      case "simulation-clock-tick": {
        const received = launcher.data.received.reduce(
          (sum, e) => {
            if (e.tag === "construct-fabricated") {
              sum.fabricated += 1;
            } else if (e.tag === "command-set-working-count") {
              sum.working = e.count;
            } else {
              sum[
                e.resource as Resource.ELECTRICITY | Resource.PACKAGED_SATELLITE
              ] += e.amount;
            }
            return sum;
          },
          {
            [Resource.ELECTRICITY]: 0,
            [Resource.PACKAGED_SATELLITE]: 0,
            fabricated: 0,
            working: null as null | number,
          }
        );
        launcher.data.received = [];

        if (received.fabricated > 0) {
          launcher.data.working += received.fabricated;
          launcher.data.count += received.fabricated;
        }
        if (received.working !== null) {
          launcher.data.working = received.working;
        }
        if (launcher.data.working <= 0) {
          launcher.data.received.push(
            {
              tag: "supply",
              resource: Resource.ELECTRICITY,
              amount: received[Resource.ELECTRICITY],
              receivedTick: event.tick,
              toId: launcher.id,
            },
            {
              tag: "supply",
              resource: Resource.PACKAGED_SATELLITE,
              amount: received[Resource.PACKAGED_SATELLITE],
              receivedTick: event.tick,
              toId: launcher.id,
            }
          );
          break;
        }
        launcher.data.charge += received[Resource.ELECTRICITY];

        let enoughSupplied = true;
        const powerNeeded =
          launcher.data.working *
          tickConsumption.launcher.get(Resource.ELECTRICITY)!;
        if (launcher.data.charge < powerNeeded) {
          enoughSupplied = false;
          emitted.push({
            tag: "draw",
            resource: Resource.ELECTRICITY,
            amount: powerNeeded - received[Resource.ELECTRICITY],
            forId: launcher.id,
            receivedTick: event.tick + 1,
          });
        }
        const satellitesNeeded =
          launcher.data.working *
          tickConsumption.launcher.get(Resource.PACKAGED_SATELLITE)!;
        if (received[Resource.PACKAGED_SATELLITE] < satellitesNeeded) {
          enoughSupplied = false;
          emitted.push({
            tag: "draw",
            resource: Resource.PACKAGED_SATELLITE,
            amount: satellitesNeeded - received[Resource.PACKAGED_SATELLITE],
            forId: launcher.id,
            receivedTick: event.tick + 1,
          });
        }
        if (!enoughSupplied) {
          (
            [Resource.ELECTRICITY, Resource.PACKAGED_SATELLITE] as const
          ).forEach((resource) => {
            const amount = received[resource];
            if (amount > 0) {
              launcher.data.received.push({
                tag: "supply",
                resource,
                amount,
                toId: launcher.id,
                receivedTick: (event as Events<"simulation-clock-tick">).tick,
              });
            }
          });
          break;
        }
        for (let i = 0; i < launcher.data.working; i++) {
          emitted.push({
            tag: "launch-satellite",
            receivedTick: event.tick + 1,
          });
        }
      }
    }
  }
  return [launcher, emitted];
}

export function getLaunchers(simulation: Simulation) {
  const { count, working, charge } = (
    simulation.processors.get("launcher-0") as LauncherManager | undefined
  )?.data ?? { count: 0, working: 0, charge: 0 };
  return { count, working, charge };
}
