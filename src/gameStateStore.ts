import { writable } from "svelte/store";
import type {
  CircuitBreaker,
  Consumption,
  GameAction,
  GameState,
  Production,
  Resource,
  Worker,
} from "./types";

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

export type Consumer = keyof Consumption;
export type Producer = keyof Production;

export const tick: GameAction = (state) => {
  // to correctly trip breaker before overconsumption of electricity in the network,
  // we need to know how much elec we're about to consume (& how much we're about to produce)
  const totalProjectedElectricityConsumption = Object.entries(
    state.working
  ).reduce(
    (accu, [worker, on]) =>
      accu + (on ? tickConsumption[worker]?.electricity || 0 : 0),
    0
  );
  const totalProjectedElectricityProduction = Object.entries(
    state.working
  ).reduce(
    (accu, [worker, on]) =>
      accu + (on ? tickProduction[worker]?.electricity || 0 : 0),
    0
  );
  const breakerShouldTrip =
    state.resources.electricity + totalProjectedElectricityProduction <
    totalProjectedElectricityConsumption;
  console.debug({
    working: state.working,
    breakerShouldTrip,
    current: state.resources.electricity,
    projected: {
      prod: totalProjectedElectricityProduction,
      cons: totalProjectedElectricityConsumption,
    },
  });
  const breaker: CircuitBreaker = {
    tripped:
      state.breaker.tripped || (!state.breaker.tripped && breakerShouldTrip),
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
  // worker state machine second draft :
  `Awaiting_Input 'start working' => Working 'work' => Working 'finish task' => Awaiting_Input;
[Awaiting_Input Working] 'turn off' ~> Turned_Off 'turn on' ~> Awaiting_Input;
[Awaiting_Input Working] 'circuit broken' -> Awaiting_Power 'circuit unbroken' -> Awaiting_Input;`;

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

  // 1: accounting for all inputs, how many of this worker type can produce work this tick?
  const satisfiedWorkers = workingWorkerCount.map(([worker, count]) => {
    let inputSatisfiedCount: number = count;
    Object.entries(tickConsumption[worker] ?? {}).forEach(
      ([resource, amount]: [Resource, number]) => {
        const satisfiedWorkers = Math.min(
          Math.floor(resources[resource] / amount), // how many workers _could_ be satisfied by the resource total
          count
        );
        inputSatisfiedCount = Math.min(satisfiedWorkers, inputSatisfiedCount);
      }
    );
    return [worker, inputSatisfiedCount];
  });

  satisfiedWorkers.forEach(([worker, count]: [Worker, number]) => {
    Object.entries(tickConsumption[worker] ?? {}).forEach(
      ([resource, amount]: [Resource, number]) => {
        // 2: deduct from each resource that number times the correspoding required input amount [for that worker type]
        resources[resource] -= count * amount;
      }
    );
  });

  satisfiedWorkers.forEach(([worker, count]: [Worker, number]) => {
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
