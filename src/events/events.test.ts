import type { EventStream, Processor } from "./processing";
import {
  createClock,
  createCollector,
  createMemoryStream,
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
      expect.objectContaining({ tag: "star-flux-emission", tick: 1 }),
    ]);
  });

  test("collector should output power from processing star flux emission", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream());
    insertProcessor(simulation, createCollector());
    (
      [
        { tag: "star-flux-emission", flux: 1, tick: 1 },
        { tag: "simulation-clock-tick", tick: 2 },
      ] as BusEvent[]
    ).forEach((event) => {
      simulation = processUntilSettled(broadcastEvent(simulation, event));
    });
    expect(
      (simulation.processors.get("stream-0") as EventStream).data.received
    ).toEqual([
      { tag: "star-flux-emission", flux: 1, tick: 1 },
      { tag: "simulation-clock-tick", tick: 2 },
      { tag: "collector-power-production", power: 1, tick: 2 },
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
      { tag: "star-flux-emission", flux: 1, tick: 1 },
      { tag: "collector-power-production", power: 0, tick: 1 }, // no flux received during previous tick
      { tag: "simulation-clock-tick", tick: 2 },
      { tag: "star-flux-emission", flux: 1, tick: 2 },
      { tag: "collector-power-production", power: 1, tick: 2 },
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
});
