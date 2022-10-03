import type { Input } from "./types";
import type { GameAction, GameState, Resources } from "./gameStateStore";
import { Construct, Resource } from "./gameStateStore";

export const constructionCosts: Record<Construct, Input> = {
  [Construct.SOLAR_COLLECTOR]: new Map([
    [Resource.ELECTRICITY, 100],
    [Resource.METAL, 10],
  ]),
  [Construct.MINER]: new Map([
    [Resource.ELECTRICITY, 150],
    [Resource.METAL, 30],
  ]),
  [Construct.REFINERY]: new Map([
    [Resource.ELECTRICITY, 500],
    [Resource.METAL, 45],
  ]),
  [Construct.SATELLITE_LAUNCHER]: new Map([
    [Resource.ELECTRICITY, 2 * 10 ** 3],
    [Resource.METAL, 170],
  ]),
  [Construct.SATELLITE_FACTORY]: new Map([
    [Resource.ELECTRICITY, 10 ** 4],
    [Resource.METAL, 13 * 10 ** 2],
  ]),
};

export function canBuild(cost: Input, resources: Resources): boolean {
  return [...cost].every(([resource, amount]) => resources[resource] >= amount);
}
export function build(building: Construct): GameAction {
  return (state: GameState) => {
    const cost = constructionCosts[building];
    const { resources, buildings } = state;
    if (canBuild(cost, resources)) {
      [...cost].forEach(([resource, amount]) => {
        resources[resource] -= amount;
      });
      buildings[building] += 1;
    }
    return { ...state, resources, buildings };
  };
}

export const launchCost = new Map([
  [Resource.ELECTRICITY, 1.4 * 10 ** 3],
  [Resource.PACKAGED_SATELLITE, 1],
] as const);
export const launchSatellite: GameAction = (state) => {
  return {
    ...state,
    resources: {
      ...state.resources,
      [Resource.ELECTRICITY]:
        state.resources[Resource.ELECTRICITY] -
        (launchCost.get(Resource.ELECTRICITY) as number),
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
