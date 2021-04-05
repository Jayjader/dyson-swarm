import type { Building, GameAction, GameState, Input } from "./types";

export const constructionCosts: Record<Building, Input> = {
  miner: { electricity: 150, metal: 30 },
  refiner: { electricity: 500, metal: 45 },
  satelliteFactory: { electricity: 2 * 10 ** 3, metal: 170 },
  satelliteLauncher: { electricity: 10 ** 4, metal: 13 * 10 ** 2 },
  solarCollector: { electricity: 100, metal: 10 },
};

export const build = (building: Building) => (state: GameState) => {
  const cost = constructionCosts[building];
  const { resources, buildings } = state;
  const notEnough = Object.entries(cost).filter(
    ([resource, amount]) => resources[resource] < amount
  );
  notEnough.forEach(([resource, amount]) => {
    console.warn(
      `not enough ${resource} to build ${building}: have ${resources[resource]}, need ${amount}`
    );
  });
  if (notEnough.length === 0) {
    Object.entries(cost).forEach(([resource, amount]) => {
      resources[resource] -= amount;
    });
    buildings[building] += 1;
  }
  return { ...state, resources, buildings };
};

const launchCost: Input = { electricity: 1.4 * 10 ** 3, packagedSatellites: 1 };
export const launchSatellite: GameAction = (state) => {
  return state.resources.electricity < launchCost.electricity ||
    state.resources.packagedSatellites < launchCost.packagedSatellites
    ? state
    : {
        ...state,
        resources: {
          ...state.resources,
          electricity: state.resources.electricity - 1,
          packagedSatellites: state.resources.packagedSatellites - 1,
        },
        swarm: { ...state.swarm, satellites: state.swarm.satellites + 1 },
      };
};
export const tripBreaker: GameAction = (state) => {
  return { ...state, breaker: { tripped: !state.breaker.tripped } };
};

export default { ...build, launchSatellite, tripBreaker };
