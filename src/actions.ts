import type { GameAction, GameState, Result } from "./types";

export const tripBreaker: GameAction = (state) => {
  return { ...state, breaker: { tripped: !state.breaker.tripped } };
};
export const buildSolarCollector: GameAction = (state) => {
  const collectorBuildCost = { electricity: 100, metal: 10 };
  const { resources, buildings } = state;
  if (
    resources.electricity >= collectorBuildCost.electricity &&
    resources.metal >= collectorBuildCost.metal
  ) {
    resources.electricity -= collectorBuildCost.electricity;
    resources.metal -= collectorBuildCost.metal;
    buildings.solarCollector += 1;
  }
  return { ...state, resources, buildings };
};

export const buildMiner: GameAction = (state) => {
  const minerBuildCost = { electricity: 150, metal: 30 };
  const { resources, buildings } = state;
  if (
    resources.electricity >= minerBuildCost.electricity &&
    resources.metal >= minerBuildCost.metal
  ) {
    resources.electricity -= minerBuildCost.electricity;
    resources.metal -= minerBuildCost.metal;
    buildings.miner += 1;
  }
  return { ...state, resources, buildings };
};

export const buildRefiner: GameAction = (state) => {
  const refinerBuildCost = { electricity: 500, metal: 45 };
  const { resources, buildings } = state;
  if (
    resources.electricity >= refinerBuildCost.electricity &&
    resources.metal >= refinerBuildCost.metal
  ) {
    resources.electricity -= refinerBuildCost.electricity;
    resources.metal -= refinerBuildCost.metal;
    buildings.refiner += 1;
  }
  return { ...state, resources, buildings };
};

export const buildSatFactory: GameAction = (state) => {
  const buildCost = { electricity: 2 * 10 ** 3, metal: 170 };
  const { resources, buildings } = state;
  const { electricity, metal } = resources;
  if (electricity >= buildCost.electricity && metal >= buildCost.metal) {
    resources.electricity -= buildCost.electricity;
    resources.metal -= buildCost.metal;
    buildings.satelliteFactory += 1;
  }
  return { ...state, resources, buildings };
};

export const buildSatLauncher: GameAction = (state) => {
  const buildCost = { electricity: 10 ** 4, metal: 13 * 10 ** 2 };
  const { resources, buildings } = state;
  if (
    resources.electricity >= buildCost.electricity &&
    resources.metal >= buildCost.metal
  ) {
    resources.electricity -= buildCost.electricity;
    resources.metal -= buildCost.metal;
    buildings.satelliteLauncher = true;
  }

  return { ...state, resources, buildings };
};

export const launchSatellite: (state: GameState) => Result<GameState> = (
  state
) => {
  const launchCost = { electricity: 1.4 * 10 ** 3 };
  const resources = { ...state.resources };
  const swarm = { ...state.swarm };
  resources.electricity -= launchCost.electricity;
  if (resources.electricity < 0) return new Error("Not enough energy!");
  resources.packagedSatellites -= 1;
  swarm.satellites += 1;
  return { ...state, resources, swarm };
};

const minerConsumption = 3;
const refinerElecConsumption = 5;
const refinerOreConsumption = 3;
const factoryElecConsumption = 25;
const factoryMetalConsumption = 2;

export const update: GameAction = (state) => {
  const nextState = { ...state };
  const { buildings, resources, breaker } = nextState;

  // produce elec
  resources.electricity += 1 * buildings.solarCollector;

  // consume elec
  // forecast total elec consumption
  const totalConsumption =
    buildings.miner * minerConsumption +
    buildings.refiner * refinerElecConsumption +
    buildings.satelliteFactory * factoryElecConsumption;
  if (!breaker.tripped && resources.electricity < totalConsumption) {
    breaker.tripped = true;
    console.log("tripped circuit breaker!");
  }
  if (breaker.tripped) {
    return nextState;
  }
  console.log(`consuming ${totalConsumption}`);

  for (
    let i = 0;
    i < buildings.miner && resources.electricity >= minerConsumption;
    i += 1
  ) {
    resources.electricity -= minerConsumption;
    resources.ore += 1;
  }

  for (
    let i = 0;
    i < buildings.refiner &&
    resources.electricity >= refinerElecConsumption &&
    resources.ore >= refinerOreConsumption;
    i += 1
  ) {
    resources.electricity -= refinerElecConsumption;
    resources.ore -= refinerOreConsumption;
    resources.metal += 1;
  }

  for (
    let i = 0;
    i < buildings.satelliteFactory &&
    resources.electricity >= factoryElecConsumption &&
    resources.metal >= factoryMetalConsumption;
    i += 1
  ) {
    resources.electricity -= factoryElecConsumption;
    resources.metal -= factoryMetalConsumption;
    resources.packagedSatellites += 1;
  }

  return nextState;
};

// this is pure ergonomics, allowing manipulating the set of build actions
// and invoking like `build.solarCollector()` (avoid repeating the "build")
export const build = {
  solarCollector: buildSolarCollector,
  miner: buildMiner,
  refiner: buildRefiner,
  satelliteFactory: buildSatFactory,
  satelliteLauncher: buildSatLauncher,
};

export default { ...build, launchSatellite };
