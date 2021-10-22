import { tick, tickConsumption, tickProduction } from "../gameStateStore";
import {
  __CONSUMERS,
  __PRODUCERS,
  Building,
  Consumer,
  GameState,
  isProducer,
  Producer,
  Resource,
  Worker,
} from "../types";

function randInt(from: number, to: number): number {
  return Math.floor(Math.random() * (to - from + 1) + from);
}

function randWorker(): Worker {
  return [
    Building.SOLAR_COLLECTOR,
    Building.MINER,
    Building.REFINERY,
    Building.SATELLITE_FACTORY,
    "swarm",
  ][randInt(0, 4)] as Worker;
}

const randConsumer = (): Consumer =>
  __CONSUMERS[randInt(0, __CONSUMERS.length - 1)] as Consumer;
const randProducer = (): Producer =>
  __PRODUCERS[randInt(0, __PRODUCERS.length - 1)] as Producer;
function randConsumingProducer(): Consumer & Producer {
  let consumer: Consumer & Producer;
  do {
    consumer = randConsumer();
  } while (!isProducer(consumer));
  return consumer;
}
function randMaterialConsumingProducer(): Consumer & Producer {
  let producer: Consumer & Producer;
  do {
    producer = randConsumingProducer();
  } while (![Building.REFINERY, Building.SATELLITE_FACTORY].includes(producer));
  return producer;
}

function elementwiseAdd(
  obj1: Record<string, number>,
  obj2: Record<string, number>
): Record<string, number> {
  const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  return Object.fromEntries(
    Array.from(keys).map((key: string) => [key, obj1?.[key] + obj1?.[key]])
  ) as Record<string, number>;
}
function elementwiseMult<key extends string | number>(
  n: number,
  obj: Map<key, number>
): Map<key, number> {
  return new Map([...obj].map(([k, v]) => [k, n * v]));
}

describe("update/tick", function () {
  const initialState: () => GameState = () => ({
    breaker: { tripped: false },
    buildings: {
      [Building.SOLAR_COLLECTOR]: 0,
      [Building.MINER]: 0,
      [Building.REFINERY]: 0,
      [Building.SATELLITE_FACTORY]: 0,
      [Building.SATELLITE_LAUNCHER]: 0,
    },
    resources: {
      [Resource.ELECTRICITY]: randInt(100, 200),
      [Resource.ORE]: randInt(3, 500),
      [Resource.METAL]: randInt(5, 30),
      [Resource.PACKAGED_SATELLITE]: randInt(2, 200),
    },
    swarm: { satellites: 0 },
    working: {
      [Building.SOLAR_COLLECTOR]: true,
      [Building.MINER]: true,
      [Building.REFINERY]: true,
      [Building.SATELLITE_FACTORY]: true,
      swarm: true,
    },
  });

  test("tick returns new object", () => {
    // Arrange
    const state: GameState = initialState();

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).not.toBe(state);
  });

  test("single solar collector production", () => {
    // Arrange
    const zeroState = initialState();
    const state: GameState = {
      ...zeroState,
      buildings: {
        ...zeroState.buildings,
        [Building.SOLAR_COLLECTOR]: 1,
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState.resources).toEqual({
      ...state.resources,
      [Resource.ELECTRICITY]:
        state.resources[Resource.ELECTRICITY] +
        tickProduction[Building.SOLAR_COLLECTOR].get(Resource.ELECTRICITY),
    });
  });

  test("single miner consumption + production", () => {
    // Arrange
    const zeroState = initialState();
    const state: GameState = {
      ...zeroState,
      buildings: { ...zeroState.buildings, [Building.MINER]: 1 },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        [Resource.ELECTRICITY]:
          state.resources[Resource.ELECTRICITY] -
          tickConsumption[Building.MINER].get(Resource.ELECTRICITY),
        [Resource.ORE]:
          state.resources[Resource.ORE] +
          tickProduction[Building.MINER].get(Resource.ORE),
      },
    });
  });

  test("single refiner consumption + production", () => {
    // Arrange
    const zeroState = initialState();
    const state: GameState = {
      ...zeroState,
      buildings: { ...zeroState.buildings, [Building.REFINERY]: 1 },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        [Resource.ELECTRICITY]:
          state.resources[Resource.ELECTRICITY] -
          tickConsumption[Building.REFINERY].get(Resource.ELECTRICITY),
        [Resource.ORE]:
          state.resources[Resource.ORE] -
          tickConsumption[Building.REFINERY].get(Resource.ORE),
        [Resource.METAL]:
          state.resources[Resource.METAL] +
          tickProduction[Building.REFINERY].get(Resource.METAL),
      },
    });
  });

  test("single satellite factory consumption + production", () => {
    // Arrange
    const zeroState = initialState();
    const state: GameState = {
      ...zeroState,
      buildings: { ...zeroState.buildings, [Building.SATELLITE_FACTORY]: 1 },
      resources: {
        ...zeroState.resources,
        ...Object.fromEntries([...tickConsumption[Building.SATELLITE_FACTORY]]),
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        [Resource.ELECTRICITY]:
          state.resources[Resource.ELECTRICITY] -
          tickConsumption[Building.SATELLITE_FACTORY].get(Resource.ELECTRICITY),
        [Resource.METAL]:
          state.resources[Resource.METAL] -
          tickConsumption[Building.SATELLITE_FACTORY].get(Resource.METAL),
        [Resource.PACKAGED_SATELLITE]:
          state.resources[Resource.PACKAGED_SATELLITE] +
          tickProduction[Building.SATELLITE_FACTORY].get(
            Resource.PACKAGED_SATELLITE
          ),
      },
    });
  });

  test("breaker is tripped before attempting to consume more elec than we have", () => {
    // Arrange
    const count = randInt(9, 29);
    // const count = 1;
    const worker = randConsumingProducer();
    const workerConsumption = tickConsumption[worker];
    const initialElectricity =
      workerConsumption.get(Resource.ELECTRICITY) * count - 1; // _just_ not enough to satisfy projected consumption
    let initialOtherResources = [
      ...[...workerConsumption].filter(
        ([resource, _]: [Resource, number]) => resource !== Resource.ELECTRICITY
      ),
    ];
    initialOtherResources = initialOtherResources.map(
      ([consumed_resource, consumed_amount]: [Resource, number]) => [
        consumed_resource,
        consumed_amount * count,
      ]
    );
    const zeroState = initialState();
    const state: GameState = {
      ...zeroState,
      buildings: { ...zeroState.buildings, [worker as Building]: count },
      resources: {
        ...zeroState.resources,
        [Resource.ELECTRICITY]: initialElectricity,
        ...initialOtherResources,
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
      ...initialState(),
      swarm: { satellites: 1 },
    };
    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual(state);
  });

  test("swarm satellite correctly supplements solar collector elec production", () => {
    // Arrange
    const zeroState = initialState();
    const state: GameState = {
      ...zeroState,
      swarm: { satellites: 1 },
      buildings: { ...zeroState.buildings, [Building.SOLAR_COLLECTOR]: 1 },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        [Resource.ELECTRICITY]:
          state.resources[Resource.ELECTRICITY] +
          tickProduction[Building.SOLAR_COLLECTOR].get(Resource.ELECTRICITY) +
          tickProduction.swarm.get(Resource.ELECTRICITY),
      },
    });
  });

  test("multiple of 1 building produce in proportion to their number", () => {
    // Arrange
    const count = randInt(2, 25);
    const zeroState = initialState();
    const state: GameState = {
      ...zeroState,
      buildings: { ...zeroState.buildings, [Building.SOLAR_COLLECTOR]: count },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState).toEqual({
      ...state,
      resources: {
        ...state.resources,
        [Resource.ELECTRICITY]:
          state.resources[Resource.ELECTRICITY] +
          count *
            tickProduction[Building.SOLAR_COLLECTOR].get(Resource.ELECTRICITY),
      },
    });
  });

  test("multiples of 1 building type consume in proportion to their number", () => {
    // Arrange
    const count = randInt(2, 5);
    const zeroState = initialState();
    const state: GameState = {
      ...zeroState,
      buildings: { ...zeroState.buildings, [Building.MINER]: count },
      resources: {
        ...zeroState.resources,
        ...[...tickConsumption[Building.MINER]].map(([resource, amount]) => [
          resource,
          amount * count,
        ]),
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState.resources).toMatchObject({
      ...[...tickConsumption[Building.MINER]].map(([resource, amount]) => [
        resource,
        amount * count,
      ]),
    });
  });

  test("resource consumption cannot result in negative count of a stored resource", () => {
    // Arrange
    const count = randInt(2, 29);
    const zeroState = initialState();
    const state: GameState = {
      ...zeroState,
      buildings: { ...zeroState.buildings, [Building.REFINERY]: count },
      resources: {
        ...zeroState.resources,
        [Resource.ORE]:
          count * tickConsumption[Building.REFINERY].get(Resource.ORE) - 1,
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
    const zeroState = initialState();
    const worker = randConsumer();

    const state: GameState = {
      ...zeroState,
      buildings: { ...zeroState.buildings, [worker]: count },
      resources: {
        ...zeroState.resources,
        ...elementwiseMult(count, tickConsumption[worker]),
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState.resources).toEqual(
      expect.objectContaining({
        ...Object.entries(
          tickConsumption[worker]
        ).map(([resource, _amount]) => [resource, 0]),
      })
    );
  });

  test("if only some workers are input-satisfied, they should still consume/produce", () => {
    // Arrange
    const count = randInt(9, 29);
    const worker = randMaterialConsumingProducer();
    const zeroState = initialState();
    const onlySomeResources = elementwiseMult(
      count - 5,
      tickConsumption[worker]
    );
    const state: GameState = {
      ...zeroState,
      buildings: { ...zeroState.buildings, [worker]: count },
      resources: {
        ...zeroState.resources,
        ...Object.fromEntries(onlySomeResources),
        [Resource.ELECTRICITY]:
          count * tickConsumption[worker].get(Resource.ELECTRICITY),
      },
    };

    // Act
    const nextState = tick(state);

    // Assert
    expect(nextState.resources).toMatchObject(
      Object.fromEntries(
        [...tickProduction[worker]]
          .filter(([resource, _]) => resource !== Resource.ELECTRICITY)
          .map(([resource, amount]) => [
            resource,
            (count - 5) * amount + state.resources[resource],
          ])
      )
    );
  });
});
