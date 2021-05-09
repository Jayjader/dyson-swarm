import type { GameState } from "../types";
import { tick, tickConsumption, tickProduction } from "../gameStateStore";

function randInt(from: number, to: number): number {
  return Math.floor(Math.random() * (to - from + 1) + from);
}

describe("update/tick", function () {
  const initialState: GameState = {
    breaker: { tripped: false },
    buildings: {
      solarCollector: 0,
      miner: 0,
      refiner: 0,
      satelliteFactory: 0,
      satelliteLauncher: 0,
    },
    resources: {
      electricity: randInt(100, 200),
      metal: randInt(5, 30),
      packagedSatellites: randInt(2, 200),
      ore: randInt(3, 500),
    },
    swarm: { satellites: 0 },
    working: {
      miner: true,
      solarCollector: true,
      refiner: true,
      satelliteFactory: true,
      swarm: true,
    },
  };
  test("tick returns new object", () => {
    // Arrange
    const state: GameState = { ...initialState };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).not.toBe(state);
    Object.entries(nextState).forEach(([name, value]) => {
      expect(value).not.toBe(state[name]);
    });
  });
  test("single solar collector production", () => {
    // Arrange
    const state: GameState = {
      ...initialState,
      buildings: {
        ...initialState.buildings,
        solarCollector: 1,
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        electricity:
          state.resources.electricity +
          tickProduction.solarCollector.electricity,
      },
    });
  });
  test("single miner consumption + production", () => {
    // Arrange
    const state: GameState = {
      ...initialState,
      buildings: {
        ...initialState.buildings,
        miner: 1,
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        electricity:
          state.resources.electricity - tickConsumption.miner.electricity,
        ore: state.resources.ore + tickProduction.miner.ore,
      },
    });
  });
  test("single refiner consumption + production", () => {
    // Arrange
    const state: GameState = {
      ...initialState,
      buildings: {
        ...initialState.buildings,
        refiner: 1,
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        electricity:
          state.resources.electricity - tickConsumption.refiner.electricity,
        ore: state.resources.ore - tickConsumption.refiner.ore,
        metal: state.resources.metal + tickProduction.refiner.metal,
      },
    });
  });
  test("single satellite factory consumption + production", () => {
    // Arrange
    const state: GameState = {
      ...initialState,
      buildings: {
        ...initialState.buildings,
        satelliteFactory: 1,
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        electricity:
          state.resources.electricity -
          tickConsumption.satelliteFactory.electricity,
        metal: state.resources.metal - tickConsumption.satelliteFactory.metal,
        packagedSatellites:
          state.resources.packagedSatellites +
          tickProduction.satelliteFactory.packagedSatellites,
      },
    });
  });
  test("breaker is tripped before attempting to consume more elec than we have", () => {
    // Arrange
    const state: GameState = {
      ...initialState,
      buildings: {
        ...initialState.buildings,
        miner: randInt(1, 20),
        refiner: randInt(1, 4),
        satelliteFactory: randInt(1, 9),
      },
      resources: {
        ...initialState.resources,
        electricity:
          tickConsumption.miner.electricity +
          tickConsumption.refiner.electricity +
          tickConsumption.satelliteFactory.electricity -
          1, // _just_ not enough to satisfy projected consumption
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      breaker: { tripped: true },
    });
  });
  test("swarm satellite by itself does nothing", () => {
    // Arrange
    const state: GameState = {
      ...initialState,
      swarm: { satellites: 1 },
    };
    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual(state);
  });
  test("swarm satellite correctly supplements solar collector elec production", () => {
    // Arrange
    const state: GameState = {
      ...initialState,
      swarm: { satellites: 1 },
      buildings: { ...initialState.buildings, solarCollector: 1 },
    };
    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        electricity:
          state.resources.electricity +
          tickProduction.solarCollector.electricity +
          tickProduction.swarm.electricity,
      },
    });
  });
  test("multiple of 1 building produce in proportion to their number", () => {
    // Arrange
    const count = randInt(2, 25);
    const state: GameState = {
      ...initialState,
      buildings: { ...initialState.buildings, solarCollector: count },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        electricity:
          state.resources.electricity +
          count * tickProduction.solarCollector.electricity,
      },
    });
  });
  test("multiple of 1 building consume in proportion to their number", () => {
    // Arrange
    const count = randInt(2, 5);
    const state: GameState = {
      ...initialState,
      buildings: { ...initialState.buildings, miner: count },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        electricity:
          state.resources.electricity -
          count * tickConsumption.miner.electricity,
        ore: state.resources.ore + count * tickProduction.miner.ore,
      },
    });
  });
  test("resource consumption cannot result in negative count of a stored resource", () => {
    // Arrange
    const count = randInt(2, 29);
    const state: GameState = {
      ...initialState,
      buildings: { ...initialState.buildings, refiner: count },
      resources: {
        ...initialState.resources,
        ore: count * tickConsumption.refiner.ore - 1,
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    Object.entries(nextState.resources).forEach(([_resource, count]) => {
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
  test("workers should consume what resources are available even if supply cannot meet demand for all", () => {
    // Arrange
    const count = randInt(9, 29);
    const state: GameState = {
      ...initialState,
      buildings: { ...initialState.buildings, refiner: count },
      resources: {
        ...initialState.resources,
        ore: (count - 5) * tickConsumption.refiner.ore,
        electricity: count * tickConsumption.refiner.electricity + 100,
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState.resources.ore).toEqual(0);
    // for next test [partial production] : expect(nextState.resources.metal).toEqual(state.resources.metal + (count - 5) * tickProduction.
  });
  test("workers should produce from what resources are available even if supply cannot meet demand for all", () => {
    // Arrange
    const count = randInt(9, 29);
    const state: GameState = {
      ...initialState,
      buildings: { ...initialState.buildings, refiner: count },
      resources: {
        ...initialState.resources,
        ore: (count - 5) * tickConsumption.refiner.ore,
        electricity: count * tickConsumption.refiner.electricity + 100,
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState.resources.metal).toEqual(
      state.resources.metal + (count - 5) * tickProduction.refiner.metal
    );
  });
});
