import type { Readable } from "svelte/store";
import { derived, writable } from "svelte/store";
import type { Input } from "./types";

export enum Resource {
  ELECTRICITY = "power",
  ORE = "ore",
  METAL = "metal",
  PACKAGED_SATELLITE = "satellite",
}

export type Resources = Record<Resource, number>;

export enum Construct {
  SOLAR_COLLECTOR = "collector",
  MINER = "miner",
  REFINERY = "refinery",
  SATELLITE_FACTORY = "factory",
  SATELLITE_LAUNCHER = "launcher",
}

const __OUTPUTS = ["flux", "power", "ore", "metal", "satellite"] as const;
export type Output = typeof __OUTPUTS[number];

export type Buildings = Record<Construct, number>;

export type Swarm = {
  satellites: number;
};

export type CircuitBreaker = {
  tripped: boolean;
};

/* TODO: try introducing fabricator, star, planet?*/
export const __PRODUCERS = [
  "satellite",
  Construct.MINER,
  Construct.REFINERY,
  Construct.SATELLITE_FACTORY,
  Construct.SOLAR_COLLECTOR,
] as const;
export type Producer = typeof __PRODUCERS[number];
export const __CONSUMERS = [
  Construct.MINER,
  Construct.REFINERY,
  Construct.SATELLITE_FACTORY,
  Construct.SATELLITE_LAUNCHER,
] as const;
export type Consumer = typeof __CONSUMERS[number];
export type Actor = Consumer | Producer;
export function isProducer(w: Actor): w is Producer {
  return __PRODUCERS.includes(w as Producer);
}
export function isConsumer(w: Actor): w is Consumer {
  return __CONSUMERS.includes(w as Consumer);
}

export type Working = Map<Actor, number>;
export type GameState = {
  resources: Resources;
  buildings: Buildings;
  swarm: Swarm;
  breaker: CircuitBreaker;
  working: Working;
};

export type GameAction = (state: GameState) => GameState;

export const tickConsumption = {
  launcher: new Map([
    [Resource.ELECTRICITY, 1.4 * 10 ** 3] as const,
    [Resource.PACKAGED_SATELLITE, 1] as const,
  ] as const),
  miner: new Map([[Resource.ELECTRICITY, 3] as const] as const),
  refinery: new Map([
    [Resource.ELECTRICITY, 5] as const,
    [Resource.ORE, 3] as const,
  ] as const),
  factory: new Map([
    [Resource.ELECTRICITY, 25] as const,
    [Resource.METAL, 2] as const,
  ] as const),
} as const;

export const tickProduction = {
  [Construct.MINER]: new Map([["ore", 1] as const] as const),
  [Construct.REFINERY]: new Map([["metal", 1] as const] as const),
  [Construct.SATELLITE_FACTORY]: new Map([["satellite", 1] as const] as const),
  [Construct.SOLAR_COLLECTOR]: new Map([["power", 1] as const] as const),
  satellite: new Map([["flux", 1] as const] as const),
} as const;

export const satisfiedWorkers: (
  resources: Resources,
  workingWorkerCount: Map<Actor, number>
) => Array<[Actor, number]> = (resources, workingWorkerCount) =>
  [...workingWorkerCount].map(([worker, count]) => {
    let inputSatisfiedCount: number = count;
    if (!isConsumer(worker)) {
      inputSatisfiedCount =
        worker !== "satellite"
          ? count
          : effectiveSwarmCount(
              workingWorkerCount.get(Construct.SOLAR_COLLECTOR)!,
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
    return [worker, inputSatisfiedCount] as [Actor, number];
  });

export const effectiveSwarmCount = (
  solarCollectorCount: number,
  swarmCount: number
): number => (solarCollectorCount > 0 ? swarmCount : 0);

function workingWorkers(state: GameState): Map<Actor, number> {
  return new Map(
    [...state.working.entries()].reduce<[Actor, number][]>(
      (accu, [worker, count]) =>
        count > 0 ? [...accu, [worker, count]] : accu,
      []
    )
  );
}

export const tick: GameAction = (state) => {
  const working = [...workingWorkers(state).entries()];
  // to correctly trip breaker before overconsumption of electricity in the network,
  // we need to know how much elec we're about to consume (& how much we're about to produce)
  const totalProjectedElectricityConsumption = working.reduce(
    (accu, [worker, count]) =>
      accu +
      count *
        (isConsumer(worker)
          ? tickConsumption[worker].get(Resource.ELECTRICITY) ?? 0
          : 0),
    0
  );
  const totalProjectedElectricityProduction = working.reduce(
    (accu, [worker, count]) =>
      accu +
      count *
        (tickProduction[worker as unknown as keyof typeof tickProduction].get(
          Resource.ELECTRICITY as never
        ) ?? 0),
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

  workingWorkerCount.forEach(([worker, count]: [Actor, number]) => {
    if (isConsumer(worker)) {
      [...tickConsumption[worker]].forEach(([input, amount]) => {
        resources[input] -= count * amount;
      });
    }
  });

  const buildings = { ...state.buildings };
  workingWorkerCount.forEach(([worker, count]) => {
    if (isProducer(worker)) {
      [...tickProduction[worker]].forEach(([output, amount]) => {
        switch (output) {
          case "flux":
            break;
          case "power":
            resources[Resource.ELECTRICITY] += count * amount;
            break;
          case "ore":
            resources[Resource.ORE] += count * amount;
            break;
          case "metal":
            resources[Resource.METAL] += count * amount;
            break;
          case "satellite":
            resources[Resource.PACKAGED_SATELLITE] += count * amount;
            break;
        }
      });
    }
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
