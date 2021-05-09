import type {
  CircuitBreaker,
  Consumption,
  GameAction,
  GameState,
  Production,
  Resource,
  Worker,
} from "./types";
import { writable } from "svelte/store";

export const tickConsumption: Consumption = {
  miner: { electricity: 3 },
  refiner: { electricity: 5, ore: 3 },
  satelliteFactory: { electricity: 25, metal: 2 },
};

export const tickProduction: Production = {
  miner: { ore: 1 },
  refiner: { metal: 1 },
  satelliteFactory: { packagedSatellites: 1 },
  solarCollector: { electricity: 1 },
  swarm: { electricity: 20 },
};

export const tick: GameAction = (state) => {
  // to preemptively trip breaker we need to know how much elec we're about to consume
  const totalProjectedElectricityConsumption = Object.entries(
    state.working
  ).reduce(
    (accu, [worker, on]) =>
      accu + (on ? tickConsumption[worker]?.electricity || 0 : 0),
    0
  );
  const breaker: CircuitBreaker = {
    tripped:
      state.breaker.tripped ||
      (!state.breaker.tripped &&
        state.resources.electricity < totalProjectedElectricityConsumption),
  };

  if (breaker.tripped) {
    return {
      resources: { ...state.resources },
      buildings: { ...state.buildings },
      working: { ...state.working },
      swarm: { ...state.swarm },
      breaker,
    };
  }
  // resources.electricity -= totalElectricityConsumption
  // needs workers as state machines; only workers that have all their inputs fulfilled can consume
  // worker state machine first draft :
  `arrange [Inactive Working];

    Inactive 'turn on' ~> Waiting_for_Input 'turn off' ~> Inactive;
    Waiting_for_Input 'input mats' -> Waiting_for_Input;
    Waiting_for_Input 'has all mats' => Working 'work' => Working;
    Working 'finished working' => Waiting_for_Input;`;

  // const consumers = Object.keys(tickConsumption);
  const resources = { ...state.resources };
  const workingWorkerCount = Object.entries(state.working)
    .filter(([_, on]) => on)
    .map(([worker, _]) => worker as Worker)
    .map(
      (worker) =>
        [
          worker,
          worker === "swarm" ? state.swarm.satellites : state.buildings[worker],
        ] as [Worker, number] // get count
    )
    .filter(
      ([worker, count]) =>
        (worker === "swarm" && state.buildings.solarCollector === 0
          ? 0
          : count) > 0 // swarm has no influence without solar collectors
    );

  workingWorkerCount.forEach(([worker, count]) => {
    Object.entries(tickConsumption[worker] ?? {}).forEach(
      ([resource, amount]: [Resource, number]) => {
        const availableResourcesPerWorker = resources[resource] / count;
        if (availableResourcesPerWorker >= amount) {
          resources[resource] -= count * amount;
        } else {
          const satisfiedWorkers = Math.min(
            Math.floor(resources[resource] / amount), // how many workers could be satisfied by the resource total
            count
          );
          resources[resource] -= satisfiedWorkers * amount;
        }
      }
    );
  });

  workingWorkerCount.forEach(([worker, count]) => {
    Object.entries(tickProduction?.[worker] || {}).forEach(
      ([resource, amount]) => {
        resources[resource] += count * amount;
      }
    );
  });

  return {
    resources,
    buildings: { ...state.buildings },
    swarm: { ...state.swarm },
    working: { ...state.working },
    breaker,
  };
};

export function createGameState(init: GameState) {
  const { subscribe, update } = writable(init);
  return {
    subscribe,
    tick: () => update(($state) => tick($state)),
    action: (a: GameAction) => update(($state) => a($state)),
  };
}
