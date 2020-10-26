import type { Resources, Swarm, State, GameAction } from "./types";

export const buildSolarCollector: GameAction = (state: State) => {
    const collectorBuildCost = {electricity: 100, metal: 10};
    let {resources, buildings} = state;
    if (resources.electricity >= collectorBuildCost.electricity && resources.metal >= collectorBuildCost.metal){
        resources.electricity -= collectorBuildCost.electricity;
        resources.metal -= collectorBuildCost.metal;
        buildings.solarCollector += 1;
    }
    return {...state, resources, buildings};
}

export const buildMiner: GameAction = (state: State) => {
    const minerBuildCost = {electricity: 150, metal: 30};
    let { resources, buildings } = state;
    if (resources.electricity >= minerBuildCost.electricity && resources.metal >= minerBuildCost.metal) {
        resources.electricity -= minerBuildCost.electricity;
        resources.metal -= minerBuildCost.metal;
        buildings.miner += 1;
    }
    return {...state, resources, buildings};

}

// todo: buildRefinery, buildSatFactory & buildSatLauncher

export const launchSatellite: GameAction = (state: State) => {
    const resources: Resources = {
        ...state.resources,
        packagedSatellites: state.resources.packagedSatellites + 1
    }
    const swarm: Swarm = {
        ...state.swarm,
        satellites: state.swarm.satellites + 1
    }
    return { ...state, resources, swarm }
}

export const update: GameAction = (state: State) => {
    const {buildings} = state;
    let {resources} = state;
    // produce elec
    resources.electricity += 1 * buildings.solarCollector;

    // consume elec
    const minerConsumption = 3;
    for (let i = 0; i<buildings.miner && resources.electricity>=minerConsumption; i+=1) {
        resources.electricity -= minerConsumption;
        resources.ore += 1;
    }

    const refinerElecConsumption = 5;
    const refinerOreConsumption = 3;
    for (let i = 0; i<buildings.refiner && resources.electricity >= refinerElecConsumption && resources.ore >= refinerOreConsumption; i+=1) {
        resources.electricity -= refinerElecConsumption;
        resources.ore -= refinerOreConsumption;
        resources.metal += 1;
    }

    const factoryElecConsumption = 25;
    const factoryMetalConsumption = 2;
    for (let i = 0; i<buildings.satelliteFactory && resources.electricity >= factoryElecConsumption && resources.metal >= factoryMetalConsumption; i+=1) {
        resources.electricity -= factoryElecConsumption;
        resources.metal -= factoryMetalConsumption;
        resources.packagedSatellites += 1;	
    }

    return {
        ...state,
        resources,
        buildings
    }
};

