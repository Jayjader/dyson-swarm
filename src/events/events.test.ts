import {
  Construct,
  constructionCosts,
  Resource,
  tickConsumption,
  tickProduction,
} from "../gameRules";
import { isEditing, type Pause } from "../hud/types";
import type { BusEvent as BusEvent } from "./events";
import { broadcastEvent, insertProcessor, processUntilSettled } from "./index";
import type { Id, Processor } from "./processes";
import { type Clock, createClock } from "./processes/clock";
import {
  type CollectorManager,
  createCollectorManager,
} from "./processes/collector";
import { createMemoryStream, type EventStream } from "./processes/eventStream";
import {
  createFabricator,
  type Fabricator,
  getFabricator,
} from "./processes/fabricator";
import {
  createLauncherManager,
  type LauncherManager,
} from "./processes/launcher";
import { createMinerManager, type MinerManager } from "./processes/miner";
import { createPlanet } from "./processes/planet";
import type { PowerGrid } from "./processes/powerGrid";
import { createPowerGrid } from "./processes/powerGrid";
import { createRefinerManager, type RefinerManager } from "./processes/refiner";
import { createSwarm } from "./processes/satelliteSwarm";
import {
  createFactoryManager,
  type SatelliteFactoryManager,
} from "./processes/satFactory";
import { createStar } from "./processes/star";
import { createStorage } from "./processes/storage";
import { loadSave, type SaveState } from "../save/save";

function emptySave(): SaveState {
  return {
    processors: [],
    stream: {
      id: "stream-0",
      tag: "stream",
      incoming: [],
      data: { unfinishedTick: 0, received: [] },
    },
  };
}
describe("event bus", () => {
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
      let simulation = loadSave(emptySave());
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
  test.each<BusEvent[][]>([
    [[{ tag: "command-simulation-clock-play", timeStamp: 1, afterTick: 1 }]],
  ])(
    "clock should switch to play when receiving command event to do so %j",
    (events) => {
      let simulation = loadSave(emptySave());
      insertProcessor(simulation, createMemoryStream());
      insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1, mode: "pause" })
      );
      events.forEach((event) => {
        simulation = processUntilSettled(broadcastEvent(simulation, event));
      });
      expect(
        (
          simulation.processors.get("stream-0") as EventStream
        ).data.received.get(2)
      ).toContainEqual(
        expect.objectContaining({
          tag: "simulation-clock-play",
          beforeTick: 2,
        } as BusEvent)
      );
    }
  );
  test("clock should switch to pause when receiving command while in play", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, mode: "play" })
    );
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-simulation-clock-pause",
        timeStamp: 1,
        afterTick: 1,
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        2
      )
    ).toContainEqual(
      expect.objectContaining({
        tag: "simulation-clock-pause",
        beforeTick: 2,
      } as BusEvent)
    );
  });
  test("clock should switch to indirect pause when receiving command while in play", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, mode: "play" })
    );
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-simulation-clock-indirect-pause",
        timeStamp: 1,
        afterTick: 0,
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        1
      )
    ).toContainEqual(
      expect.objectContaining({
        tag: "simulation-clock-indirect-pause",
        beforeTick: 1,
      } as BusEvent)
    );
  });
  test("clock should switch to play when receiving command for indirect-resume while in indirect pause", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, mode: "indirect-pause" })
    );
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-simulation-clock-indirect-resume",
        timeStamp: 1,
        afterTick: 0,
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        1
      )
    ).toContainEqual(
      expect.objectContaining({
        tag: "simulation-clock-indirect-resume",
        beforeTick: 1,
      } as BusEvent)
    );
  });
  test.each<BusEvent[]>([
    [
      {
        tag: "command-simulation-clock-indirect-pause",
        timeStamp: 0,
        afterTick: 0,
      },
    ],
    [
      {
        tag: "command-simulation-clock-indirect-resume",
        timeStamp: 0,
        afterTick: 0,
      },
    ],
  ])(
    "clock should ignore indirect command %j while already in pause",
    (event) => {
      let simulation = loadSave(emptySave());
      insertProcessor(simulation, createMemoryStream());
      insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1, mode: "pause" })
      );
      simulation = processUntilSettled(broadcastEvent(simulation, event));
      expect(
        (
          simulation.processors.get("stream-0") as EventStream
        ).data.received.get(0)
      ).not.toContainEqual(
        expect.objectContaining({
          // we're just looking at events emitted by the clock, so we can implicitly exclude all player commands (that start with "command-")
          tag: expect.stringMatching(/^simulation-clock/),
        })
      );
    }
  );
  test.each<BusEvent>([
    { tag: "command-simulation-clock-play", afterTick: 17, timeStamp: 1 },
    { tag: "command-simulation-clock-pause", afterTick: 17, timeStamp: 1 },
  ])(
    "clock should ignore direct command %j when indirectly paused",
    (event) => {
      let simulation = loadSave(emptySave());
      insertProcessor(simulation, createMemoryStream());
      insertProcessor(
        simulation,
        createClock(0, "clock-0", {
          mode: "indirect-pause",
          tick: 17,
          speed: 2,
        })
      );
      simulation = processUntilSettled(broadcastEvent(simulation, event));
      expect(
        (simulation.processors.get("clock-0") as Clock).data.state
      ).toEqual([{ tick: 17, speed: 2 }, "indirect-pause"]);

      expect(
        (simulation.processors.get("stream-0") as EventStream).data.received
      ).not.toContainEqual(
        expect.objectContaining({
          // we're just looking at events emitted by the clock, so we can implicitly exclude all player commands (that start with "command-")
          tag: expect.stringMatching(/^simulation-clock/),
        })
      );
    }
  );

  test("clock should enter editing-speed state when receiving command to start editing speed", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    const clock = createClock(0, "clock-0", {
      speed: 1,
      tick: 0,
      mode: "play",
    });
    insertProcessor(simulation, clock);
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-simulation-clock-start-editing-speed",
        afterTick: 0,
        timeStamp: 1,
      })
    );
    expect(
      isEditing((simulation.processors.get("clock-0") as Clock).data.state)
    ).toBeTruthy();
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        1
      )
    ).toContainEqual(
      expect.objectContaining({
        tag: "simulation-clock-editing-speed",
        beforeTick: 1,
      })
    );
  });

  test("clock should change speed when receiving command while paused", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    const clock = createClock(0, "clock-0", {
      speed: 1,
      tick: 0,
      mode: "pause",
    });
    insertProcessor(simulation, clock);
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-simulation-clock-set-speed",
        speed: 30,
        afterTick: 0,
        timeStamp: 1,
      })
    );
    expect(
      (simulation.processors.get(clock.id) as Clock).data.state
    ).toEqual<Pause>([{ tick: 0, speed: 30 }, "pause"]);
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        1
      )
    ).toContainEqual({
      tag: "simulation-clock-new-speed",
      speed: 30,
      beforeTick: 1,
    });
  });

  test("clock should emit ticks according to speed", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    const clock = createClock(0, "clock-0", {
      speed: 10,
      tick: 0,
      mode: "play",
    });
    insertProcessor(simulation, clock);
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "outside-clock-tick",
        timeStamp: 1001,
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        1
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 1 });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        2
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 2 });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        3
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 3 });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        4
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 4 });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        5
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 5 });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        6
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 6 });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        7
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 7 });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        8
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 8 });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        9
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 9 });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        10
      )
    ).toContainEqual({ tag: "simulation-clock-tick", tick: 10 });
  });

  test.each([
    [
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 1001 },
      ],
      { 1: [{ tag: "simulation-clock-tick", tick: 1 }] },
    ],
    [
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 3001 },
      ],
      {
        1: [{ tag: "simulation-clock-tick", tick: 1 }],
        2: [{ tag: "simulation-clock-tick", tick: 2 }],
        3: [{ tag: "simulation-clock-tick", tick: 3 }],
      },
    ],
    [
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 1 },
        { tag: "outside-clock-tick", timeStamp: 1002 },
        { tag: "outside-clock-tick", timeStamp: 1003 },
      ],
      { 1: [{ tag: "simulation-clock-tick", tick: 1 }] },
    ],
  ] as const)(
    "clock in play should emit simulation tick events when outside clock has advanced one or more entire time steps %j %j",
    (events, stream) => {
      let simulation = loadSave(emptySave());
      // insertProcessor(simulation, createMemoryStream());
      insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1, tick: 0, mode: "play" })
      );

      events.forEach((event) => {
        simulation = processUntilSettled(broadcastEvent(simulation, event));
      });
      Object.entries(stream).forEach(([tick, slice]) => {
        expect(
          (
            simulation.processors.get("stream-0") as EventStream
          ).data.received.get(parseInt(tick, 10))
          // @ts-ignore
        ).toEqual(expect.arrayContaining(slice));
      });
    }
  );

  test("star should output flux from processing simulation clock tick", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 1 })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        2
      )
    ).toEqual([
      expect.objectContaining({ tag: "star-flux-emission", receivedTick: 2 }),
    ]);
  });

  test("collector should output power from processing star flux emission", () => {
    let simulation = loadSave(emptySave());
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
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        3
      )
    ).toEqual([
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: count * tickProduction.collector.get(Resource.ELECTRICITY)!,
        receivedTick: 3,
      },
    ]);
  });
  test("collector and star over time", () => {
    let simulation = loadSave(emptySave());
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
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        3
      )
    ).toEqual([
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
    let simulation = loadSave(emptySave());
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
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(3)).toContainEqual({
      tag: "supply",
      resource: Resource.ELECTRICITY,
      amount: 1,
      receivedTick: 3,
      toId: "miner-1",
    });
  });

  test("miner should draw power on sim clock tick when working", () => {
    let simulation = loadSave(emptySave());
    const miner = createMinerManager({ count: 1 });
    insertProcessor(simulation, miner);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 1 })
    );

    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received.get(2)).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption.miner.get(Resource.ELECTRICITY),
      forId: miner.id,
      receivedTick: 2,
    });
  });
  test("miner should mine planet when supplied with power", () => {
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(5)).toContainEqual({
      tag: "mine-planet-surface",
      minerCount: 1,
      receivedTick: 5,
    });
  });
  test("miner integration", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    insertProcessor(simulation, createCollectorManager({ count: 3 }));
    insertProcessor(simulation, createPowerGrid());
    insertProcessor(simulation, createMinerManager({ count: 1 }));

    (
      [
        { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
        { tag: "simulation-clock-tick", tick: 2 }, // collectors produce power from collected flux
        { tag: "command-reset-circuit-breaker", afterTick: 2 }, // miner has been drawing on empty grid so circuit breaker needs to be reset
        { tag: "simulation-clock-tick", tick: 3 }, // grid stores power received & grid supplies power to miner
        { tag: "simulation-clock-tick", tick: 4 }, // miner mines planet
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received.get(5)).toContainEqual({
      tag: "mine-planet-surface",
      minerCount: 1,
      receivedTick: 5,
    });
  });

  test("planet should produce ore when mined", () => {
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(3)).toContainEqual({
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
    let simulation = loadSave(emptySave());
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
    let simulation = loadSave(emptySave());
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
      ).data.received.get(3)
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
    let simulation = loadSave(emptySave());
    const refiner = createRefinerManager({ count: 1 });
    insertProcessor(simulation, refiner);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 1 })
    );

    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received.get(2)).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!,
      forId: refiner.id,
      receivedTick: 2,
    });
    expect(stream.data.received.get(2)).toContainEqual({
      tag: "draw",
      resource: Resource.ORE,
      amount: tickConsumption[Construct.REFINER].get(Resource.ORE)!,
      forId: refiner.id,
      receivedTick: 2,
    });
  });
  test("refiner should refine ore into metal when supplied with power (and ore)", () => {
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(16)).toContainEqual({
      tag: "produce",
      resource: Resource.METAL,
      amount: tickProduction[Construct.REFINER].get(Resource.METAL),
      receivedTick: 16,
    });
  });
  test("refiner integration", () => {
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(7)).toContainEqual({
      tag: "produce",
      resource: Resource.METAL,
      amount: tickProduction[Construct.REFINER].get(Resource.METAL),
      receivedTick: 7,
    });
  });

  test("factory should draw power and metal on simulation clock tick", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    const factory = createFactoryManager({ count: 1 });
    insertProcessor(simulation, factory);
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 2 })
    );
    const stream = simulation.processors.get("stream-0")! as Processor & {
      tag: "stream";
    };
    expect(stream.data.received.get(3)).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption.factory.get(Resource.ELECTRICITY)!,
      receivedTick: 3,
      forId: factory.id,
    });
    expect(stream.data.received.get(3)).toContainEqual({
      tag: "draw",
      resource: Resource.METAL,
      amount: tickConsumption.factory.get(Resource.METAL)!,
      receivedTick: 3,
      forId: factory.id,
    });
  });
  test("factory should produce packaged satellite when supplied with power and metal", () => {
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(3)).toContainEqual({
      tag: "produce",
      resource: Resource.PACKAGED_SATELLITE,
      amount: tickProduction.factory.get(Resource.PACKAGED_SATELLITE),
      receivedTick: 3,
    });
  });
  test("factory integration", () => {
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(4)).toContainEqual({
      tag: "produce",
      resource: Resource.PACKAGED_SATELLITE,
      amount: tickProduction.factory.get(Resource.PACKAGED_SATELLITE),
      receivedTick: 4,
    });
  });

  test("launcher should draw power when not fully charged", () => {
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(3)).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption.launcher.get(Resource.ELECTRICITY),
      forId: launcher.id,
      receivedTick: 3,
    });
  });
  test("launcher should draw packaged satellite when fully charged", () => {
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(3)).toContainEqual({
      tag: "draw",
      resource: Resource.PACKAGED_SATELLITE,
      amount: tickConsumption.launcher.get(Resource.PACKAGED_SATELLITE),
      forId: launcher.id,
      receivedTick: 3,
    });
  });
  test("launcher should launch supplied satellite on sim clock tick when fully charged", () => {
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(3)).toContainEqual({
      tag: "launch-satellite",
      receivedTick: 3,
    });
  });
  test("launcher should empty charge when launching satellite", () => {
    let simulation = loadSave(emptySave());
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
    expect(
      (simulation.processors.get(launcher.id)! as LauncherManager).data.charge
    ).toEqual(0);
  });

  test("swarm should increase in count when satellite is launched", () => {
    let simulation = loadSave(emptySave());
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
    let simulation = loadSave(emptySave());
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
    expect(stream.data.received.get(4)).toContainEqual({
      tag: "satellite-flux-reflection",
      flux: tickProduction.satellite.get("flux")! * count,
      receivedTick: 4,
    });
  });
  test("collector should produce energy when processing satellite reflected emission", () => {
    let simulation = loadSave(emptySave());
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
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        3
      )
    ).toEqual([
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: count * tickProduction.collector.get(Resource.ELECTRICITY)!,
        receivedTick: 3,
      },
    ]);
  });
  test("swarm integration", () => {
    let simulation = loadSave(emptySave());
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
      let simulation = loadSave(emptySave());
      insertProcessor(simulation, createMemoryStream());
      const fabricator = createFabricator();
      fabricator.data.job = construct;
      insertProcessor(simulation, fabricator);
      simulation = processUntilSettled(
        broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 5 })
      );
      expect(
        (
          simulation.processors.get("stream-0") as EventStream
        ).data.received.get(6)
      ).toEqual(
        [...constructionCosts[construct]].map(([resource, amount]) => ({
          tag: "draw",
          resource,
          amount,
          forId: fabricator.id,
          receivedTick: 6,
        }))
      );
    }
  );
  test.each<Construct>([...Object.keys(constructionCosts)] as Construct[])(
    "fabricator should emit new %s when supplied with the needed materials and power and it is the current job",
    (construct) => {
      let simulation = loadSave(emptySave());
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
        (
          simulation.processors.get("stream-0") as EventStream
        ).data.received.get(6)
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
      let simulation = loadSave(emptySave());
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
  test("fabricator should clear internal job when receiving command to do so", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    const fabricator = createFabricator();
    fabricator.data.job = Construct.SATELLITE_FACTORY;
    insertProcessor(simulation, fabricator);
    // act
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-clear-fabricator-job",
        afterTick: 1,
        timeStamp: 67892,
      })
    );
    // assert
    expect(getFabricator(simulation).job).toBeNull();
  });

  test("grid should trip breaker when receiving more draw than it can supply in a given simulation clock tick", () => {
    let simulation = loadSave(emptySave());
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
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        48
      )
    ).toContainEqual({ tag: "circuit-breaker-tripped", onTick: 48 });
    const gridUpdated = simulation.processors.get(grid.id) as PowerGrid;
    expect(gridUpdated.data.breakerTripped).toBeTruthy();
    expect(gridUpdated.data.stored).toEqual(0);
  });
  test("tripped power grid should supply nothing (but still store production", () => {
    let simulation = loadSave(emptySave());
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
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        48
      )
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
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    const grid = createPowerGrid();
    grid.data.breakerTripped = true;
    insertProcessor(simulation, grid);
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-reset-circuit-breaker",
        afterTick: 77,
        timeStamp: Math.floor(150 * Math.random()),
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        78
      )
    ).toContainEqual({ tag: "circuit-breaker-reset", onTick: 78 });
    expect(
      (simulation.processors.get("power grid-0") as PowerGrid).data
        .breakerTripped
    ).toBeFalsy();
  });
  test("grid should fulfill command to trip breaker", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    const grid = createPowerGrid();
    grid.data.breakerTripped = false;
    insertProcessor(simulation, grid);
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-trip-circuit-breaker",
        afterTick: 77,
        timeStamp: Math.floor(150 * Math.random()),
      })
    );
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        78
      )
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
      let simulation = loadSave(emptySave());
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
          timeStamp: Math.floor(150 * Math.random()),
        })
      );
      const manager = simulation.processors.get(`${construct}-0`) as
        | MinerManager
        | RefinerManager
        | SatelliteFactoryManager
        | LauncherManager;
      expect(manager.data.working).toEqual(0);
      expect(
        (
          simulation.processors.get("stream-0") as EventStream
        ).data.received.get(2)
      ).toContainEqual({
        tag: "working-count-set",
        construct,
        count: 0,
        beforeTick: 2,
      } as BusEvent);
    }
  );

  test("fabricator job queue state should update when receiving command to do so", () => {
    let simulation = loadSave(emptySave());
    insertProcessor(simulation, createMemoryStream());
    const fabricator = createFabricator();
    insertProcessor(simulation, fabricator);
    simulation = processUntilSettled(
      broadcastEvent(simulation, {
        tag: "command-set-fabricator-queue",
        queue: [{ building: Construct.SOLAR_COLLECTOR }],
        afterTick: 17777777,
        timeStamp: Math.floor(150 * Math.random()),
      })
    );
    expect(
      (simulation.processors.get(fabricator.id) as Fabricator).data.queue
    ).toEqual([{ building: Construct.SOLAR_COLLECTOR }]);
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received.get(
        17777778
      )
    ).toContainEqual({
      tag: "fabricator-queue-set",
      queue: [{ building: Construct.SOLAR_COLLECTOR }],
      beforeTick: 17777778,
    });
  });
});
