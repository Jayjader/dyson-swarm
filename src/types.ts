export enum Resource {
  ELECTRICITY = "elec",
  ORE = "ore",
  METAL = "metal",
  PACKAGED_SATELLITE = "pkg_sat",
}
export type Resources = Record<Resource, number>;

export enum Building {
  SOLAR_COLLECTOR = "solar",
  MINER = "miner",
  REFINERY = "refiner",
  SATELLITE_FACTORY = "sat_factory",
  SATELLITE_LAUNCHER = "sat_launcher",
}

export type Buildings = Record<Building, number>;

export interface Swarm {
  satellites: number;
}

export interface CircuitBreaker {
  tripped: boolean;
}

export interface FactoryToggle {
  paused: boolean;
}

export type Input = Map<Resource, number>;
export type Output = Map<Resource, number>;

export type Worker =
  | "swarm"
  | Building.SOLAR_COLLECTOR
  | Building.MINER
  | Building.REFINERY
  | Building.SATELLITE_FACTORY;

export type Working = Record<Worker, boolean>;

export const __PRODUCERS = [
  "swarm",
  Building.MINER,
  Building.REFINERY,
  Building.SATELLITE_FACTORY,
  Building.SOLAR_COLLECTOR,
];
export type Producer = Extract<
  Worker,
  | "swarm"
  | Building.MINER
  | Building.REFINERY
  | Building.SATELLITE_FACTORY
  | Building.SOLAR_COLLECTOR
>;
export const isProducer = (w: Worker): w is Producer => __PRODUCERS.includes(w);
export type Production = Record<Producer, Output>;

export const __CONSUMERS: Worker[] = [
  Building.MINER,
  Building.REFINERY,
  Building.SATELLITE_FACTORY,
];
export type Consumer = Extract<
  Worker,
  Building.MINER | Building.REFINERY | Building.SATELLITE_FACTORY
>;
export const isConsumer = (w: Worker): w is Consumer => __CONSUMERS.includes(w);
export type Consumption = Record<Consumer, Input>;

export type BuildChoice = null | Building;

// export interface Constructs {
//   buildings: Buildings;
//   swarm: Swarm;
// }
// export interface Inventory {
//   resources: Resources;
// }
// export type Clock = { tick: (n?: number) => void; reset: () => void };
// export type Planet = { mass: number };
// export type Star = { mass: number; output: number };
// export type Radiation = {
//   total: number;
//   towardsCollectors: (area: number, radius: number) => number;
// };
// export interface Environment {
//   planet: Planet;
//   radiation: Radiation;
//   star: Star;
//   clock: Clock;
// }
// export interface WorldState {
//   constructs: Constructs;
//   inventory: Inventory;
//   environment: Environment;
// }
export type Time = "play" | "pause";
export type SwarmHUD = {
  satellites: number;
};
export interface HUD {
  swarm: SwarmHUD;
  buildings: Buildings;
}
type Repeat<count extends number, bo extends SingleBuildOrder> = count extends 1
  ? never
  : {
      count: count;
    } & SingleBuildOrder;
type AutoBuildOrder = SingleBuildOrder & { auto: true };
export type BuildOrder =
  | SingleBuildOrder
  | Repeat<number, SingleBuildOrder>
  | AutoBuildOrder;

export function isRepeat(
  bo: BuildOrder
): bo is Repeat<number, SingleBuildOrder> {
  return (bo as Repeat<number, SingleBuildOrder>).count !== undefined;
}
export function isAuto(bo: BuildOrder): bo is AutoBuildOrder {
  return (bo as AutoBuildOrder).auto;
}
export interface BuildQueue {
  state: Array<BuildOrder>;
}
export interface UiState {
  time: Time;
  hud: HUD;
  buildQueue: BuildQueue;
}
export interface GameState {
  resources: Resources;
  buildings: Buildings;
  swarm: Swarm;
  breaker: CircuitBreaker;
  working: Working;
}

export type GameAction = (state: GameState) => GameState;
type SingleBuildOrder = {
  building: Building;
};
