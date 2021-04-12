export interface Resources {
  electricity: number;
  ore: number;
  metal: number;
  packagedSatellites: number;
}
export type Resource = keyof Resources;

export interface Buildings {
  solarCollector: number;
  miner: number;
  refiner: number;
  satelliteFactory: number;
  satelliteLauncher: number;
}
export type Building = keyof Buildings;

export interface Swarm {
  satellites: number;
}

export interface CircuitBreaker {
  tripped: boolean;
}

export interface FactoryToggle {
  paused: boolean;
}

export type Working = Record<Worker, boolean>;

export type BuildChoice = null | Building;

export interface GameState {
  resources: Resources;
  buildings: Buildings;
  swarm: Swarm;
  breaker: CircuitBreaker;
  working: Working;
}

export type GameAction = (state: GameState) => GameState;
export type Input = Partial<Record<Resource, number>>;
export type Output = Partial<Record<Resource | Building, number>>;
export type Worker =
  | Extract<
      Building,
      "solarCollector" | "miner" | "refiner" | "satelliteFactory"
    >
  | "swarm";
export type Production = Record<Worker, Output>;
export type Consumption = Partial<Record<Worker, Input>>;
