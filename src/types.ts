export interface Resources {
  electricity: number;
  ore: number;
  metal: number;
  packagedSatellites: number;
}
export interface Buildings {
  solarCollector: number;
  miner: number;
  refiner: number;
  satelliteFactory: number;
  satelliteLauncher: boolean;
}
export interface Swarm {
  satellites: number;
}
export interface CircuitBreaker {
  tripped: boolean;
}
export interface GameState {
  resources: Resources;
  buildings: Buildings;
  swarm: Swarm;
  breaker: CircuitBreaker;
  dispatch: (
    action: GameAction | ((state: GameState) => Result<GameState>)
  ) => void;
}

export type Result<T> = T | Error;
export const ok = <T>(r: Result<T>): r is T => !(r instanceof Error);
export type GameAction = (state: GameState) => GameState;
