import type { EventStream, Id, Processor } from "./processes";
import { createMemoryStream } from "./processes";
import type { SubscriptionsFor } from "./index";
import {
  blankSave,
  broadcastEvent,
  insertProcessor,
  loadSave,
  processUntilSettled,
} from "./index";
import type { Event as BusEvent, Events } from "./events";
import {
  Construct,
  Resource,
  tickConsumption,
  tickProduction,
} from "../gameStateStore";
import { createStorage } from "./processes/storage";
import { createClock } from "./processes/clock";
import type { PowerGrid } from "./processes/powerGrid";
import { createPowerGrid } from "./processes/powerGrid";
import { createMinerManager, type MinerManager } from "./processes/miner";
import { createPlanet } from "./processes/planet";
import { createRefinerManager, type RefinerManager } from "./processes/refiner";
import { createStar } from "./processes/star";
import {
  type CollectorManager,
  createCollectorManager,
} from "./processes/collector";
import {
  createFactoryManager,
  type SatelliteFactoryManager,
} from "./processes/satFactory";
import {
  createLauncherManager,
  type LauncherManager,
} from "./processes/launcher";
import { createSwarm } from "./processes/satelliteSwarm";
import { createFabricator } from "./processes/fabricator";
import { constructionCosts } from "../actions";

describe("event bus", () => {
  test.each<BusEvent[][]>([
    [[{ tag: "outside-clock-tick", timeStamp: 0 }]],
    [
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 2 },
        { tag: "outside-clock-tick", timeStamp: 3 },
      ],
    ],
    [
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "simulation-clock-tick", tick: 1 },
        { tag: "outside-clock-tick", timeStamp: 2 },
      ],
    ],
  ])("event stream should have entire stream after processing %j", (events) => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    events.forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toEqual(events as Events<SubscriptionsFor<"stream">>[]);
  });
  test.each<BusEvent[][]>([
    [[{ tag: "outside-clock-tick", timeStamp: 0 }]],
    [
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 1 },
        { tag: "outside-clock-tick", timeStamp: 2 },
        { tag: "outside-clock-tick", timeStamp: 3 },
      ],
    ],
    [
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 6 },
      ],
    ],
  ])(
    "clock should do nothing while outside clock has not advanced an entire time step but receives %j",
    (events) => {
      let simulation = loadSave(blankSave());
      insertProcessor(simulation, createMemoryStream());
      insertProcessor(simulation, createClock(0, "clock-0", { speed: 1 }));
      events.forEach((event) => {
        simulation = processUntilSettled(broadcastEvent(simulation, event));
      });
      expect(
        (simulation.processors.get("stream-0") as EventStream).data.received
      ).not.toContain(
        expect.objectContaining({ tag: "simulation-clock-tick" })
      );
    }
  );
  test.each<BusEvent[][]>([[[{ tag: "command-simulation-clock-play" }]]])(
    "clock should switch to play when receiving command event to do so %j",
    (events) => {
      let simulation = loadSave(blankSave());
      insertProcessor(simulation, createMemoryStream());
      insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1, mode: "pause" })
      );
      events.forEach((event) => {
        simulation = processUntilSettled(broadcastEvent(simulation, event));
      });
      expect(
        (simulation.processors.get("stream-0") as EventStream).data.received
      ).toContainEqual(
        expect.objectContaining({ tag: "simulation-clock-play" })
      );
    }
  );
  test("clock should switch to pause when receiving command while in play", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, mode: "play" })
    );
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "command-simulation-clock-pause" })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toContainEqual(
      expect.objectContaining({ tag: "simulation-clock-pause" })
    );
  });
  test("clock should switch to indirect pause when receiving command while in play", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, mode: "play" })
    );
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-simulation-clock-indirect-pause",
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toContainEqual(
      expect.objectContaining({ tag: "simulation-clock-indirect-pause" })
    );
  });
  test("clock should switch to play when receiving command for indirect-resume while in indirect pause", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, mode: "indirect-pause" })
    );
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-simulation-clock-indirect-resume",
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toContainEqual(
      expect.objectContaining({ tag: "simulation-clock-indirect-resume" })
    );
  });
  test.each<BusEvent[]>([
    [{ tag: "command-simulation-clock-indirect-pause" }],
    [{ tag: "command-simulation-clock-indirect-resume" }],
  ])(
    "clock should ignore indirect command %j while already in pause",
    (event) => {
      let simulation = loadSave(blankSave());
      insertProcessor(simulation, createMemoryStream());
      insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1, mode: "pause" })
      );
      simulation = processUntilSettled(broadcastEvent(simulation, event));
      expect(
        (simulation.processors.get("stream-0") as EventStream).data.received
      ).not.toContainEqual(
        expect.objectContaining({
          tag: expect.stringMatching(/^simulation-clock-indirect/),
        })
      );
    }
  );

  test.each<BusEvent[][]>([
    [
      [{ tag: "outside-clock-tick", timeStamp: 1001 }],
      [
        { tag: "outside-clock-tick", timeStamp: 1001 },
        { tag: "simulation-clock-tick", tick: 1 },
      ],
    ],
    [
      [{ tag: "outside-clock-tick", timeStamp: 3001 }],
      [
        { tag: "outside-clock-tick", timeStamp: 3001 },
        { tag: "simulation-clock-tick", tick: 1 },
        { tag: "simulation-clock-tick", tick: 2 },
        { tag: "simulation-clock-tick", tick: 3 },
      ],
    ],
    [
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 1 },
        { tag: "outside-clock-tick", timeStamp: 1002 },
        { tag: "outside-clock-tick", timeStamp: 1003 },
      ],
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 1 },
        { tag: "outside-clock-tick", timeStamp: 1002 },
        { tag: "simulation-clock-tick", tick: 1 },
        { tag: "outside-clock-tick", timeStamp: 1003 },
      ],
    ],
  ])(
    "clock in play should emit simulation tick events when outside clock has advanced one or more entire time steps %j %j",
    (events, stream) => {
      let simulation = loadSave(blankSave());
      insertProcessor(simulation, createMemoryStream());
      insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1, tick: 0, mode: "play" })
      );

      events.forEach((event) => {
        simulation = processUntilSettled(broadcastEvent(simulation, event));
      });
      expect(
        (simulation.processors.get("stream-0") as EventStream).data.received
      ).toEqual(stream);
    }
  );
  test("simulation clock ticks interleaved with outside clock ticks over 'time'", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, tick: 0, mode: "play" })
    );

    (
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 1 },
        { tag: "outside-clock-tick", timeStamp: 1002 },
        { tag: "outside-clock-tick", timeStamp: 1003 },
        { tag: "outside-clock-tick", timeStamp: 3002 },
        { tag: "outside-clock-tick", timeStamp: 3003 },
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });

    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toEqual([
      { tag: "outside-clock-tick", timeStamp: 0 },
      { tag: "outside-clock-tick", timeStamp: 1 },
      { tag: "outside-clock-tick", timeStamp: 1002 },
      { tag: "simulation-clock-tick", tick: 1 },
      { tag: "outside-clock-tick", timeStamp: 1003 },
      { tag: "outside-clock-tick", timeStamp: 3002 },
      { tag: "simulation-clock-tick", tick: 2 },
      { tag: "simulation-clock-tick", tick: 3 },
      { tag: "outside-clock-tick", timeStamp: 3003 },
    ]);
  });
  test("star should output flux from processing simulation clock tick", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 1 })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toEqual([
      { tag: "simulation-clock-tick", tick: 1 },
      expect.objectContaining({ tag: "star-flux-emission", receivedTick: 2 }),
    ]);
  });

  test("collector should output power from processing star flux emission", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const count = 3;
    insertProcessor(simulation, createCollectorManager({ count }));
    (
      [
        { tag: "star-flux-emission", flux: 1, receivedTick: 2 },
        { tag: "simulation-clock-tick", tick: 2 },
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toEqual([
      { tag: "star-flux-emission", flux: 1, receivedTick: 2 },
      { tag: "simulation-clock-tick", tick: 2 },
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: count * tickProduction.collector.get(Resource.ELECTRICITY)!,
        receivedTick: 3,
      },
    ]);
  });
  test("collector and star over time", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    insertProcessor(simulation, createCollectorManager({ count: 1 }));
    (
      [
        { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
        { tag: "simulation-clock-tick", tick: 2 }, // collector receives flux and produces power
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toEqual([
      { tag: "simulation-clock-tick", tick: 1 },
      { tag: "star-flux-emission", flux: 1, receivedTick: 2 },
      { tag: "simulation-clock-tick", tick: 2 },
      { tag: "star-flux-emission", flux: 1, receivedTick: 3 },
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: 1,
        receivedTick: 3,
      },
    ]);
  });
  test("grid should receive power production after 3 ticks", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    insertProcessor(simulation, createCollectorManager({ count: 1 }));
    insertProcessor(simulation, createPowerGrid());

    (
      [
        { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
        { tag: "simulation-clock-tick", tick: 2 }, // collector produces power from collected flux
        { tag: "simulation-clock-tick", tick: 3 }, // grid stores power received
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });

    const processor = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `power grid` } => p.id === "power grid-0"
    )!;
    expect(processor.data.stored).toEqual(1);
  });

  test("grid should supply power when drawn", () => {
    let simulation = loadSave(blankSave());
    const powergrid = createPowerGrid();
    powergrid.data.stored = 10;
    insertProcessor(simulation, powergrid);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(
        broadcastEvent(simulation, {
          tag: "draw",
          resource: Resource.ELECTRICITY,
          amount: 1,
          forId: "miner-1",
          receivedTick: 2,
        }),
        { tag: "simulation-clock-tick", tick: 2 }
      )
    );

    const processor = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `power grid` } => p.id === "power grid-0"
    )!;
    expect(processor.data.stored).toEqual(9);
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "supply",
      resource: Resource.ELECTRICITY,
      amount: 1,
      receivedTick: 3,
      toId: "miner-1",
    });
  });

  test("miner should draw power on sim clock tick when working", () => {
    let simulation = loadSave(blankSave());
    const miner = createMinerManager({ count: 1 });
    insertProcessor(simulation, miner);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 1 })
    );

    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption.miner.get(Resource.ELECTRICITY),
      forId: miner.id,
      receivedTick: 2,
    });
  });
  test("miner should mine planet when supplied with power", () => {
    let simulation = loadSave(blankSave());
    const miner = createMinerManager({ count: 1 });
    insertProcessor(simulation, miner);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(
        broadcastEvent(simulation, {
          tag: "supply",
          resource: Resource.ELECTRICITY,
          amount: tickConsumption.miner.get(Resource.ELECTRICITY)!,
          toId: miner.id,
          receivedTick: 4,
        }),
        { tag: "simulation-clock-tick", tick: 4 }
      )
    );
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "mine-planet-surface",
      minerCount: 1,
      receivedTick: 5,
    });
  });
  test("miner integration", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    insertProcessor(simulation, createCollectorManager({ count: 3 }));
    insertProcessor(simulation, createPowerGrid());
    insertProcessor(simulation, createMinerManager({ count: 1 }));

    (
      [
        { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
        { tag: "simulation-clock-tick", tick: 2 }, // collectors produce power from collected flux
        { tag: "command-reset-circuit-breaker" }, // miner has been drawing on empty grid so circuit breaker needs to be reset
        { tag: "simulation-clock-tick", tick: 3 }, // grid stores power received & grid supplies power to miner
        { tag: "simulation-clock-tick", tick: 4 }, // miner mines planet
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "mine-planet-surface",
      minerCount: 1,
      receivedTick: 5,
    });
  });

  test("planet should produce ore when mined", () => {
    let simulation = loadSave(blankSave());
    const planet = createPlanet();
    insertProcessor(simulation, planet);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(
        broadcastEvent(simulation, {
          tag: "mine-planet-surface",
          minerCount: 1,
          receivedTick: 2,
        }),
        { tag: "simulation-clock-tick", tick: 2 }
      )
    );
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "produce",
      resource: Resource.ORE,
      amount: tickProduction.miner.get(Resource.ORE),
      receivedTick: 3,
    });
  });

  test.each<Exclude<Resource, Resource.ELECTRICITY>[]>([
    [Resource.ORE],
    [Resource.METAL],
    [Resource.PACKAGED_SATELLITE],
  ])("%p storage should store what is produced", (resource) => {
    let simulation = loadSave(blankSave());
    const storage = createStorage(resource);
    insertProcessor(simulation, storage);
    simulation = processUntilSettled(
      broadcastEvent(
        broadcastEvent(simulation, {
          tag: "produce",
          resource,
          amount: 1,
          receivedTick: 2,
        }),
        { tag: "simulation-clock-tick", tick: 2 }
      )
    );
    expect(
      (
        simulation.processors.get(storage.id)! as Processor & {
          tag: `storage-${typeof resource}`;
        }
      ).data.stored
    ).toEqual(1);
  });

  test.each<Exclude<Resource, Resource.ELECTRICITY>[]>([
    [Resource.ORE],
    [Resource.METAL],
    [Resource.PACKAGED_SATELLITE],
  ])("%p storage should supply when drawn from", (resource) => {
    let simulation = loadSave(blankSave());
    const storage = createStorage(resource);
    storage.data.stored += 20;
    insertProcessor(simulation, storage);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(
        broadcastEvent(simulation, {
          tag: "draw",
          resource,
          amount: 1,
          forId: "random-id" as Id,
          receivedTick: 2,
        }),
        { tag: "simulation-clock-tick", tick: 2 }
      )
    );
    expect(
      (
        simulation.processors.get("stream-0") as Processor & {
          tag: `stream`;
        }
      ).data.received
    ).toContainEqual({
      tag: "supply",
      resource,
      amount: 1,
      toId: "random-id" as Id,
      receivedTick: 3,
    });
    expect(
      (
        simulation.processors.get(storage.id)! as Processor & {
          tag: `storage-${typeof resource}`;
        }
      ).data.stored
    ).toEqual(19);
  });

  test("refiner should draw power and ore on sim clock tick when working", () => {
    let simulation = loadSave(blankSave());
    const refiner = createRefinerManager({ count: 1 });
    insertProcessor(simulation, refiner);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 1 })
    );

    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!,
      forId: refiner.id,
      receivedTick: 2,
    });
    expect(stream.data.received).toContainEqual({
      tag: "draw",
      resource: Resource.ORE,
      amount: tickConsumption[Construct.REFINER].get(Resource.ORE)!,
      forId: refiner.id,
      receivedTick: 2,
    });
  });
  test("refiner should refine ore into metal when supplied with power (and ore)", () => {
    let simulation = loadSave(blankSave());
    const refiner = createRefinerManager({ count: 1 });
    insertProcessor(simulation, refiner);
    insertProcessor(simulation, createMemoryStream());
    (
      [
        {
          tag: "supply",
          resource: Resource.ELECTRICITY,
          amount: tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!,
          toId: refiner.id,
          receivedTick: 15,
        },
        {
          tag: "supply",
          resource: Resource.ORE,
          amount: tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!,
          toId: refiner.id,
          receivedTick: 15,
        },
        { tag: "simulation-clock-tick", tick: 15 },
      ] as const
    ).forEach((event) => {
      simulation = broadcastEvent(simulation, event);
    });
    simulation = processUntilSettled(simulation);

    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "produce",
      resource: Resource.METAL,
      amount: tickProduction[Construct.REFINER].get(Resource.METAL),
      receivedTick: 16,
    });
  });
  test("refiner integration", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createPlanet());
    const powerGrid = createPowerGrid();
    powerGrid.data.stored +=
      10 * tickConsumption.miner.get(Resource.ELECTRICITY)! +
      10 * tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!;
    insertProcessor(simulation, powerGrid);
    insertProcessor(simulation, createMinerManager({ count: 3 }));
    insertProcessor(simulation, createStorage(Resource.ORE));
    insertProcessor(simulation, createRefinerManager({ count: 1 }));
    (
      [
        { tag: "simulation-clock-tick", tick: 1 }, // to make constructs draw power
        { tag: "simulation-clock-tick", tick: 2 }, // to make grid supply power
        { tag: "simulation-clock-tick", tick: 3 }, // to make miners mine (ie receive power)
        { tag: "simulation-clock-tick", tick: 4 }, // to make planet produce ore from being mined
        { tag: "simulation-clock-tick", tick: 5 }, // to make storage store ore received & supply ore to refiner
        { tag: "simulation-clock-tick", tick: 6 }, // to make refiner produce metal (ie receive power & ore)
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "produce",
      resource: Resource.METAL,
      amount: tickProduction[Construct.REFINER].get(Resource.METAL),
      receivedTick: 7,
    });
  });

  test("factory should draw power and metal on simulation clock tick", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const factory = createFactoryManager({ count: 1 });
    insertProcessor(simulation, factory);
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 2 })
    );
    const stream = simulation.processors.get("stream-0")! as Processor & {
      tag: "stream";
    };
    expect(stream.data.received).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption.factory.get(Resource.ELECTRICITY)!,
      receivedTick: 3,
      forId: factory.id,
    });
    expect(stream.data.received).toContainEqual({
      tag: "draw",
      resource: Resource.METAL,
      amount: tickConsumption.factory.get(Resource.METAL)!,
      receivedTick: 3,
      forId: factory.id,
    });
  });
  test("factory should produce packaged satellite when supplied with power and metal", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const factory = createFactoryManager({ count: 1 });
    insertProcessor(simulation, factory);
    simulation = broadcastEvent(
      broadcastEvent(simulation, {
        tag: "supply",
        resource: Resource.ELECTRICITY,
        amount: tickConsumption.factory.get(Resource.ELECTRICITY)!,
        receivedTick: 2,
        toId: factory.id,
      }),
      {
        tag: "supply",
        resource: Resource.METAL,
        amount: tickConsumption.factory.get(Resource.METAL)!,
        receivedTick: 2,
        toId: factory.id,
      }
    );
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 2 })
    );
    const stream = simulation.processors.get("stream-0")! as Processor & {
      tag: "stream";
    };
    expect(stream.data.received).toContainEqual({
      tag: "produce",
      resource: Resource.PACKAGED_SATELLITE,
      amount: tickProduction.factory.get(Resource.PACKAGED_SATELLITE),
      receivedTick: 3,
    });
  });
  test("factory integration", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());

    const powerGrid = createPowerGrid();
    powerGrid.data.stored +=
      10 * tickConsumption.factory.get(Resource.ELECTRICITY)!;
    insertProcessor(simulation, powerGrid);
    const metalStorage = createStorage(Resource.METAL);
    metalStorage.data.stored +=
      10 * tickConsumption.factory.get(Resource.METAL)!;
    insertProcessor(simulation, metalStorage);
    insertProcessor(simulation, createFactoryManager({ count: 1 }));
    (
      [
        { tag: "simulation-clock-tick", tick: 1 }, // to make factory draw power and metal
        { tag: "simulation-clock-tick", tick: 2 }, // to make grid supply power and storage supply metal
        { tag: "simulation-clock-tick", tick: 3 }, // to make factory produce packaged satellite
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });

    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "produce",
      resource: Resource.PACKAGED_SATELLITE,
      amount: tickProduction.factory.get(Resource.PACKAGED_SATELLITE),
      receivedTick: 4,
    });
  });

  test("launcher should draw power when not fully charged", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const launcher = createLauncherManager({ count: 1 });
    launcher.data.charge = 0;
    insertProcessor(simulation, launcher);
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 2 })
    );
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption.launcher.get(Resource.ELECTRICITY),
      forId: launcher.id,
      receivedTick: 3,
    });
  });
  test("launcher should draw packaged satellite when fully charged", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const launcher = createLauncherManager({ count: 1 });
    launcher.data.charge = tickConsumption.launcher.get(Resource.ELECTRICITY)!;
    insertProcessor(simulation, launcher);
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 2 })
    );
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "draw",
      resource: Resource.PACKAGED_SATELLITE,
      amount: tickConsumption.launcher.get(Resource.PACKAGED_SATELLITE),
      forId: launcher.id,
      receivedTick: 3,
    });
  });
  test("launcher should launch supplied satellite on sim clock tick when fully charged", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const launcher = createLauncherManager({ count: 1 });
    launcher.data.charge = tickConsumption.launcher.get(Resource.ELECTRICITY)!;
    insertProcessor(simulation, launcher);
    simulation = processUntilSettled(
      broadcastEvent(
        broadcastEvent(simulation, {
          tag: "supply",
          resource: Resource.PACKAGED_SATELLITE,
          amount: tickConsumption.launcher.get(Resource.PACKAGED_SATELLITE)!,
          receivedTick: 2,
          toId: launcher.id,
        }),
        { tag: "simulation-clock-tick", tick: 2 }
      )
    );
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "launch-satellite",
      receivedTick: 3,
    });
  });

  test("swarm should increase in count when satellite is launched", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createSwarm({ count: 0 }));
    simulation = processUntilSettled(
      broadcastEvent(
        broadcastEvent(simulation, {
          tag: "launch-satellite",
          receivedTick: 2,
        }),
        { tag: "simulation-clock-tick", tick: 2 }
      )
    );
    const swarm = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: "swarm" } => p.id === "swarm-0"
    )!;
    expect(swarm.data.count).toEqual(1);
  });
  test("swarm should reflect energy flux emitted by star", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    const count = 3;
    insertProcessor(simulation, createSwarm({ count }));
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 2 })
    );
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 3 })
    );
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "satellite-flux-reflection",
      flux: tickProduction.satellite.get("flux")! * count,
      receivedTick: 4,
    });
  });
  test("collector should produce energy when processing satellite reflected emission", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const count = 3;
    insertProcessor(simulation, createCollectorManager({ count }));
    (
      [
        { tag: "satellite-flux-reflection", flux: 1, receivedTick: 2 },
        { tag: "simulation-clock-tick", tick: 2 },
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toEqual([
      { tag: "satellite-flux-reflection", flux: 1, receivedTick: 2 },
      { tag: "simulation-clock-tick", tick: 2 },
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: count * tickProduction.collector.get(Resource.ELECTRICITY)!,
        receivedTick: 3,
      },
    ]);
  });
  test("swarm integration", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    insertProcessor(simulation, createSwarm({ count: 1 }));
    insertProcessor(simulation, createCollectorManager({ count: 1 }));
    insertProcessor(simulation, createPowerGrid());
    (
      [
        { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
        { tag: "simulation-clock-tick", tick: 2 }, // swarm reflects flux, collector produces power from collected flux (and star emits again)
        { tag: "simulation-clock-tick", tick: 3 }, // collector produces from flux from star and swarm
        { tag: "simulation-clock-tick", tick: 4 }, // grid stores power produced during previous tick
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    expect(
      (
        simulation.processors.get("power grid-0")! as Processor & {
          tag: "power grid";
        }
      ).data.stored
    ).toEqual(
      tickProduction.collector.get(Resource.ELECTRICITY)! + // production on tick 2, just direct star flux
        tickProduction.collector.get(Resource.ELECTRICITY)! * 2 // production on tick 3, direct star flux + reflected swarm flux
    );
  });

  test.each<Construct>([...Object.keys(constructionCosts)] as Construct[])(
    "fabricator should draw materials and power for current job on simulation clock tick when a job exists (job: build %s)",
    (construct) => {
      let simulation = loadSave(blankSave());
      insertProcessor(simulation, createMemoryStream());
      const fabricator = createFabricator();
      fabricator.data.job = construct;
      insertProcessor(simulation, fabricator);
      simulation = processUntilSettled(
        broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 5 })
      );
      expect(
        (simulation.processors.get("stream-0") as EventStream).data.received
      ).toEqual([
        { tag: "simulation-clock-tick", tick: 5 },
        ...[...constructionCosts[construct]].map(([resource, amount]) => ({
          tag: "draw",
          resource,
          amount,
          forId: fabricator.id,
          receivedTick: 6,
        })),
      ]);
    }
  );
  test.each<Construct>([...Object.keys(constructionCosts)] as Construct[])(
    "fabricator should emit new %s when supplied with the needed materials and power and it is the current job",
    (construct) => {
      let simulation = loadSave(blankSave());
      insertProcessor(simulation, createMemoryStream());
      const fabricator = createFabricator();
      fabricator.data.job = construct;
      insertProcessor(simulation, fabricator);

      constructionCosts[construct].forEach((amount, resource) => {
        simulation = broadcastEvent(simulation, {
          tag: "supply",
          resource,
          amount,
          toId: fabricator.id,
          receivedTick: 5,
        });
      });
      simulation = processUntilSettled(
        broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 5 })
      );
      expect(
        (simulation.processors.get("stream-0") as EventStream).data.received
      ).toContainEqual({
        tag: "construct-fabricated",
        construct,
        receivedTick: 6,
      });
    }
  );

  test.each<Construct>([
    Construct.SOLAR_COLLECTOR,
    Construct.MINER,
    Construct.REFINER,
    Construct.SATELLITE_FACTORY,
    Construct.SATELLITE_LAUNCHER,
  ])(
    "total %p count should increase by 1 when construct-fabricated received",
    (construct) => {
      let simulation = loadSave(blankSave());
      for (const createManager of [
        createCollectorManager,
        createMinerManager,
        createRefinerManager,
        createFactoryManager,
        createLauncherManager,
      ]) {
        insertProcessor(simulation, createManager({ count: 0 }));
      }
      simulation = processUntilSettled(
        broadcastEvent(
          broadcastEvent(simulation, {
            tag: "construct-fabricated",
            construct,
            receivedTick: 1,
          }),
          { tag: "simulation-clock-tick", tick: 1 }
        )
      );
      const manager = simulation.processors.get(`${construct}-0`) as
        | CollectorManager
        | MinerManager
        | RefinerManager
        | SatelliteFactoryManager
        | LauncherManager;
      expect(manager.data.count).toEqual(1);
    }
  );

  test("grid should trip breaker when receiving more draw than it can supply in a given simulation clock tick", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const grid = createPowerGrid();
    grid.data.stored = 0;
    grid.data.breakerTripped = false;
    insertProcessor(simulation, grid);
    simulation = broadcastEvent(simulation, {
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: 1,
      receivedTick: 48,
      forId: "some-test-id" as Id,
    });
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 48 })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toContainEqual({ tag: "circuit-breaker-tripped", onTick: 48 });
    const gridUpdated = simulation.processors.get(grid.id) as PowerGrid;
    expect(gridUpdated.data.breakerTripped).toBeTruthy();
    expect(gridUpdated.data.stored).toEqual(0);
  });
  test("tripped power grid should supply nothing (but still store production", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const grid = createPowerGrid();
    grid.data.breakerTripped = true;
    grid.data.stored = 100;
    insertProcessor(simulation, grid);
    simulation = broadcastEvent(
      broadcastEvent(simulation, {
        tag: "draw",
        resource: Resource.ELECTRICITY,
        amount: 1,
        receivedTick: 48,
        forId: "some-test-id" as Id,
      }),
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: 4,
        receivedTick: 48,
      }
    );
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 48 })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).not.toContainEqual({
      tag: "supply",
      resource: Resource.ELECTRICITY,
      amount: expect.any(Number),
      toId: expect.any(String),
      receivedTick: expect.any(Number),
    });
    const gridUpdated = simulation.processors.get(grid.id) as PowerGrid;
    expect(gridUpdated.data.breakerTripped).toBeTruthy();
  });
  test("grid should fulfill command to reset tripped circuit breaker", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const grid = createPowerGrid();
    grid.data.breakerTripped = true;
    insertProcessor(simulation, grid);
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-reset-circuit-breaker",
        afterTick: 77,
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toContainEqual({ tag: "circuit-breaker-reset", onTick: 78 });
    expect(
      (simulation.processors.get("power grid-0") as PowerGrid).data
        .breakerTripped
    ).toBeFalsy();
  });
  test("grid should fulfill command to trip breaker", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    const grid = createPowerGrid();
    grid.data.breakerTripped = false;
    insertProcessor(simulation, grid);
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-trip-circuit-breaker",
        afterTick: 77,
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toContainEqual({ tag: "circuit-breaker-tripped", onTick: 78 });
    expect(
      (simulation.processors.get("power grid-0") as PowerGrid).data
        .breakerTripped
    ).toBeTruthy();
  });

  test.each<Exclude<Construct, Construct.SOLAR_COLLECTOR>>([
    Construct.MINER,
    Construct.REFINER,
    Construct.SATELLITE_FACTORY,
    Construct.SATELLITE_LAUNCHER,
  ])(
    "%p working count should adjust when receiving command to change it",
    (construct) => {
      let simulation = loadSave(blankSave());
      insertProcessor(simulation, createMemoryStream());
      for (const createManager of [
        createMinerManager,
        createRefinerManager,
        createFactoryManager,
        createLauncherManager,
      ]) {
        insertProcessor(simulation, createManager({ count: 1 }));
      }
      simulation = processUntilSettled(
        broadcastEvent(simulation, {
          tag: "command-set-working-count",
          construct,
          count: 0,
          afterTick: 1,
        })
      );
      const manager = simulation.processors.get(`${construct}-0`) as
        | MinerManager
        | RefinerManager
        | SatelliteFactoryManager
        | LauncherManager;
      expect(manager.data.working).toEqual(0);
      expect(
        (simulation.processors.get("stream-0") as EventStream).data.received
      ).toContainEqual({
        tag: "working-count-set",
        construct,
        count: 0,
        beforeTick: 2,
      } as BusEvent);
    }
  );
});
