import type { GameAction, GameState, Input } from "./types";
import { Resource, Building } from "./types";

export const constructionCosts: Record<Building, Input> = {
  [Building.MINER]: new Map([
    [Resource.ELECTRICITY, 150],
    [Resource.METAL, 30],
  ]),
  [Building.REFINERY]: new Map([
    [Resource.ELECTRICITY, 500],
    [Resource.METAL, 45],
  ]),
  [Building.SATELLITE_FACTORY]: new Map([
    [Resource.ELECTRICITY, 2 * 10 ** 3],
    [Resource.METAL, 170],
  ]),
  [Building.SATELLITE_LAUNCHER]: new Map([
    [Resource.ELECTRICITY, 10 ** 4],
    [Resource.METAL, 13 * 10 ** 2],
  ]),
  [Building.SOLAR_COLLECTOR]: new Map([
    [Resource.ELECTRICITY, 100],
    [Resource.METAL, 10],
  ]),
};

export const build = (building: Building) => (state: GameState) => {
  const cost = constructionCosts[building];
  const { resources, buildings } = state;
  const notEnough = [...cost].filter(
    ([resource, amount]) => resources[resource] < amount
  );
  notEnough.forEach(([resource, amount]) => {
    console.warn(
      `not enough ${resource} to build ${building}: have ${resources[resource]}, need ${amount}`
    );
  });
  if (notEnough.length === 0) {
    [...cost].forEach(([resource, amount]) => {
      resources[resource] -= amount;
    });
    buildings[building] += 1;
  }
  return { ...state, resources, buildings };
};

const launchCost: Input = new Map([
  [Resource.ELECTRICITY, 1.4 * 10 ** 3],
  [Resource.PACKAGED_SATELLITE, 1],
]);
export const launchSatellite: GameAction = (state) => {
  return Object.entries(launchCost).filter(
    ([resource, amount]) => state.resources[resource] < amount
  ).length > 0
    ? state
    : {
        ...state,
        resources: {
          ...state.resources,
          [Resource.ELECTRICITY]: state.resources[Resource.ELECTRICITY] - 1,
          [Resource.PACKAGED_SATELLITE]:
            state.resources[Resource.PACKAGED_SATELLITE] - 1,
        },
        swarm: { ...state.swarm, satellites: state.swarm.satellites + 1 },
      };
};
export const tripBreaker: GameAction = (state) => ({
  ...state,
  breaker: { tripped: !state.breaker.tripped },
});

export const toggleWorker: (Worker) => GameAction = (worker) => (state) => ({
  ...state,
  working: {
    ...state.working,
    [worker]: !state.working[worker],
  },
});

export default {
  ...build,
  launchSatellite,
  tripBreaker,
  toggleFactories: toggleWorker,
};
