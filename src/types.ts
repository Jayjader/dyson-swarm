export interface Resources {
    electricity: number,
    ore: number,
    metal: number,
    packagedSatellites: number,
};
export interface Buildings {
    solarCollector: number,
    miner: number,
    refiner: number,
    satelliteFactory: number,
    satelliteLauncher: boolean
};
export interface Swarm {
    satellites: number,
};

export interface State {
    resources: Resources,
    buildings: Buildings,
    swarm: Swarm,
    dispatch: (action: GameAction) => void
}

export type GameAction = (state: State) => State