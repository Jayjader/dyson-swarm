import type {
  Building,
  GameAction,
  GameState,
  Input,
  Production,
  Worker,
} from "./types";
import { writable } from "svelte/store";

export const tickConsumption: Partial<Record<Building, Input>> = {
  miner: { electricity: 3 },
  refiner: { electricity: 5, ore: 3 },
  satelliteFactory: { electricity: 25, metal: 2 },
};

export const tickProduction: Production = {
  miner: { ore: 1 },
  refiner: { metal: 1 },
  satelliteFactory: { packagedSatellites: 1 },
  solarCollector: { electricity: 1 },
};

const swarmSatelliteMultiplier = 500;

const tick: GameAction = (state) => {
  const nextState = { ...state };
  const { buildings, resources, breaker, swarm } = nextState;

  // produce elec
  resources.electricity +=
    tickProduction.solarCollector.electricity * buildings.solarCollector +
    swarmSatelliteMultiplier * swarm.satellites;

  // consume elec
  // only consume if total elec consumption can be fulfilled
  const totalElectricityConsumption = Object.values(tickConsumption)
    .map((cost) => cost.electricity)
    .reduce((accu, next) => accu + next);
  if (!breaker.tripped && resources.electricity < totalElectricityConsumption) {
    breaker.tripped = true;
    console.log("tripped circuit breaker!");
  }

  if (breaker.tripped) {
    return nextState;
  } else {
    // resources.electricity -= totalElectricityConsumption
    // needs workers as state machines; only workers that have all their inputs fulfilled can consume
  }

  const workers = Object.keys(tickProduction) as Worker[];
  workers.forEach((worker) => {
    const workerCount = buildings[worker];

    const inputs = Object.entries(tickConsumption?.[worker] || {});
    inputs.forEach(([resource, amount]) => {
      const satisfiedWorkerCount =
        resources[resource] >= workerCount * amount
          ? workerCount
          : Math.floor(resources[resource] / amount);
      resources[resource] -= satisfiedWorkerCount * amount;
    });

    const outputs = Object.entries(tickProduction[worker]);
    outputs.forEach(([resource, amount]) => {
      resources[resource] += workerCount * amount;
    });
  });

  return nextState;
};

export function createGameState(init: GameState) {
  const { subscribe, update } = writable(init);
  return {
    subscribe,
    tick: () => update(($state) => tick($state)),
    action: (a: GameAction) => update(($state) => a($state)),
  };
}
