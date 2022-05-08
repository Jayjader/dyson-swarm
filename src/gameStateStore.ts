import type { Readable } from "svelte/store";
import { derived, writable } from "svelte/store";
import type {
  CircuitBreaker,
  Consumption,
  GameAction,
  GameState,
  Production,
  Resources,
  Worker,
} from "./types";
import { Building, isConsumer, isProducer, Resource } from "./types";

export const tickConsumption: Consumption = {
  [Building.MINER]: new Map([[Resource.ELECTRICITY, 3]]),
  [Building.REFINERY]: new Map([
    [Resource.ELECTRICITY, 5],
    [Resource.ORE, 3],
  ]),
  [Building.SATELLITE_FACTORY]: new Map([
    [Resource.ELECTRICITY, 25],
    [Resource.METAL, 2],
  ]),
};

export const tickProduction: Production = {
  [Building.MINER]: new Map<Resource, number>([[Resource.ORE, 1]]),
  [Building.REFINERY]: new Map<Resource, number>([[Resource.METAL, 1]]),
  [Building.SATELLITE_FACTORY]: new Map([[Resource.PACKAGED_SATELLITE, 1]]),
  [Building.SOLAR_COLLECTOR]: new Map([[Resource.ELECTRICITY, 1]]),
  swarm: new Map([[Resource.ELECTRICITY, 20]]),
};

export const satisfiedWorkers: (
  resources: Resources,
  workingWorkerCount: Map<Worker, number>
) => Array<[Worker, number]> = (resources, workingWorkerCount) =>
  [...workingWorkerCount].map(([worker, count]) => {
    let inputSatisfiedCount: number = count;
    if (!isConsumer(worker)) {
      inputSatisfiedCount =
        worker !== "swarm"
          ? count
          : effectiveSwarmCount(
              workingWorkerCount.get(Building.SOLAR_COLLECTOR),
              count
            );
    } else {
      [...tickConsumption[worker]].forEach(
        ([resource, amount]: [Resource, number]) => {
          const satisfied = Math.min(
            Math.floor(resources[resource] / amount), // how many workers _could_ be satisfied by the resource total
            count
          );
          inputSatisfiedCount = Math.min(satisfied, inputSatisfiedCount);
        }
      );
    }
    return [worker, inputSatisfiedCount] as [Worker, number];
  });

export const effectiveSwarmCount = (
  solarCollectorCount: number,
  swarmCount: number
): number => (solarCollectorCount > 0 ? swarmCount : 0);

const workerCount = (s, w): number =>
  w === "swarm" ? s.swarm.satellites : s.buildings[w];

const workingWorkers = (state: GameState): Map<Worker, number> =>
  new Map(
    Object.entries(state.working)
      .filter(([_, on]) => on) // discard workers that are off
      .map(
        // get count for each worker
        ([worker, _]) =>
          [worker, workerCount(state, worker as Worker)] as [Worker, number]
      )
  );

export const tick: GameAction = (state) => {
  // to correctly trip breaker before overconsumption of electricity in the network,
  // we need to know how much elec we're about to consume (& how much we're about to produce)
  const totalProjectedElectricityConsumption = Object.entries(
    state.working
  ).reduce(
    (accu, [worker, on]: [Worker, boolean]) =>
      accu +
      (on && isConsumer(worker)
        ? workerCount(state, worker) *
          (tickConsumption[worker].get(Resource.ELECTRICITY) ?? 0)
        : 0),
    0
  );
  const totalProjectedElectricityProduction = Object.entries(
    state.working
  ).reduce(
    (accu, [worker, on]: [Worker, boolean]) =>
      accu +
      (on && isProducer(worker)
        ? workerCount(state, worker) *
          (tickProduction[worker].get(Resource.ELECTRICITY) ?? 0)
        : 0),
    0
  );
  const breakerShouldTrip =
    state.resources[Resource.ELECTRICITY] +
      totalProjectedElectricityProduction <
    totalProjectedElectricityConsumption;

  const breaker: CircuitBreaker = {
    tripped:
      state.breaker.tripped || (!state.breaker.tripped && breakerShouldTrip),
  };

  if (breaker.tripped) {
    return {
      ...state,
      breaker,
    };
  }
  // resources.electricity -= totalElectricityConsumption
  // needs workers as state machines; only workers that have all their inputs fulfilled can consume
  // worker state machine second draft :
  /*
Awaiting_Input 'start working' => Working 'work' => Working 'finish task' => Awaiting_Input;
[Awaiting_Input Working] 'turn off' ~> Turned_Off 'turn on' ~> Awaiting_Input;
[Awaiting_Input Working] 'circuit broken' -> Awaiting_Power 'circuit unbroken' -> Awaiting_Input;
 */

  const resources = { ...state.resources };
  const workingWorkerCount = satisfiedWorkers(resources, workingWorkers(state));

  workingWorkerCount
    .filter(([worker, _]) => isConsumer(worker))
    .forEach(([worker, count]: [Worker, number]) => {
      [...tickConsumption[worker]].forEach(([input, amount]) => {
        resources[input] -= count * amount;
      });
    });

  const buildings = { ...state.buildings };
  workingWorkerCount
    .filter(([worker, _]) => isProducer(worker))
    .forEach(([worker, count]) => {
      [...tickProduction[worker]].forEach(([output, amount]) => {
        resources[output] += count * amount;
      });
    });

  return {
    resources,
    buildings,
    swarm: state.swarm,
    working: state.working,
    breaker,
  };
};

type GameStateStoreActions = {
  tick: () => void;
  action: (a: GameAction) => void;
};
export function createGameStateStore(
  init: GameState
): Readable<GameState> & GameStateStoreActions {
  const { subscribe, update } = writable(init);
  return {
    subscribe,
    tick: () => update(($state) => tick($state)),
    action: (a: GameAction) => update(($state) => a($state)),
  };
}
export type GameStateStore = ReturnType<typeof createGameStateStore>;

export const resourceArray = (s: GameStateStore) =>
  derived(s, ($s) => Object.entries($s.resources) as [Resource, number][]);
