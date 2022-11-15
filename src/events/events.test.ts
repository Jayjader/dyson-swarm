import type { EventStream, Processor } from "./processing";
import {
  createClock,
  createCollector,
  createMemoryStream,
  createMiner,
  createPlanet,
  createPowerGrid,
  createStar,
} from "./processing";
import type { SubscriptionsFor } from "./index";
import {
  blankSave,
  broadcastEvent,
  insertProcessor,
  loadSave,
  processUntilSettled,
} from "./index";
import type { Event as BusEvent, Events } from "./events";
import { Resource, tickConsumption, tickProduction } from "../gameStateStore";

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
    insertProcessor(simulation, createCollector());
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
      { tag: "collector-power-production", power: 1, receivedTick: 3 },
    ]);
  });
  test("collector and star over time", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    insertProcessor(simulation, createCollector());
    (
      [
        { tag: "simulation-clock-tick", tick: 1 },
        { tag: "simulation-clock-tick", tick: 2 },
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toEqual([
      { tag: "simulation-clock-tick", tick: 1 },
      { tag: "star-flux-emission", flux: 1, receivedTick: 2 },
      { tag: "collector-power-production", power: 0, receivedTick: 2 }, // no flux received during previous tick
      { tag: "simulation-clock-tick", tick: 2 },
      { tag: "star-flux-emission", flux: 1, receivedTick: 3 },
      { tag: "collector-power-production", power: 1, receivedTick: 3 },
    ]);
  });
  test("grid should receive power production after 3 ticks", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    insertProcessor(simulation, createCollector());
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
          tag: "draw-power",
          power: 1,
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
      tag: "supply-power",
      power: 1,
      receivedTick: 3,
      toId: "miner-1",
    });
  });

  test("miner should draw power on sim clock tick when working", () => {
    let simulation = loadSave(blankSave());
    const miner = createMiner();
    insertProcessor(simulation, miner);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "simulation-clock-tick", tick: 1 })
    );

    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "draw-power",
      power: tickConsumption.miner.get(Resource.ELECTRICITY),
      forId: miner.id,
      receivedTick: 2,
    });
  });
  test("miner should mine planet when supplied with power", () => {
    let simulation = loadSave(blankSave());
    const miner = createMiner();
    insertProcessor(simulation, miner);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(
        broadcastEvent(simulation, {
          tag: "supply-power",
          power: tickConsumption.miner.get(Resource.ELECTRICITY)!,
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
      receivedTick: 5,
    });
  });
  test("miner integration", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createStar());
    insertProcessor(simulation, createCollector("collector-0"));
    insertProcessor(simulation, createCollector("collector-1"));
    insertProcessor(simulation, createCollector("collector-2"));
    insertProcessor(simulation, createPowerGrid());
    insertProcessor(simulation, createMiner());

    (
      [
        { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
        { tag: "simulation-clock-tick", tick: 2 }, // collectors produce power from collected flux
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
      receivedTick: 5,
    });
  });

  test("planet should supply ore when mined", () => {
    let simulation = loadSave(blankSave());
    const planet = createPlanet();
    insertProcessor(simulation, planet);
    insertProcessor(simulation, createMemoryStream());
    simulation = processUntilSettled(
      broadcastEvent(
        broadcastEvent(simulation, {
          tag: "mine-planet-surface",
          receivedTick: 2,
        }),
        { tag: "simulation-clock-tick", tick: 2 }
      )
    );
    const stream = ([...simulation.processors.values()] as Processor[]).find(
      (p): p is Processor & { tag: `stream` } => p.id === "stream-0"
    )!;
    expect(stream.data.received).toContainEqual({
      tag: "supply-ore",
      ore: tickProduction.miner.get(Resource.ORE),
      receivedTick: 3,
    });
  });
});
