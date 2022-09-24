import type { Event as BusEvent } from "./events";
import {
  blankSave,
  createClock,
  createCollector,
  createMemoryStream,
  createStar,
  insertProcessor,
  loadSave,
  processAll,
  pushEvents,
} from "./events";

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
    insertProcessor(simulation, createMemoryStream("stream-id"));
    simulation = pushEvents(events, simulation);
    simulation = processAll(simulation);
    // give the event stream an extra processing loop to receive any events emitted during the test
    simulation = processAll(simulation);
    expect(
      (
        simulation.processors.get("stream-id") as unknown as {
          stream: Event[];
        }
      ).stream
    ).toEqual(events);
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
      insertProcessor(simulation, createMemoryStream("stream-id"));
      insertProcessor(simulation, createClock(0, "clock-id", { speed: 1 }));
      simulation = pushEvents(events, simulation);
      simulation = processAll(simulation);
      // give the event stream an extra processing loop to receive any events emitted during the test
      simulation = processAll(simulation);
      expect(
        (
          simulation.processors.get("stream-id") as unknown as {
            stream: Event[];
          }
        ).stream
      ).not.toContain(
        expect.objectContaining({ tag: "simulation-clock-tick" })
      );
    }
  );

  test.each<BusEvent[][]>([[[{ tag: "command-simulation-clock-play" }]]])(
    "clock should switch to play when receiving command event to do so %j",
    (events) => {
      let simulation = loadSave(blankSave());
      insertProcessor(simulation, createMemoryStream("stream-id"));
      insertProcessor(
        simulation,
        createClock(0, "clock-id", { speed: 1, mode: "pause" })
      );
      simulation = pushEvents(events, simulation);
      simulation = processAll(simulation);

      // give the event stream an extra processing loop to receive any events emitted during the test
      simulation = processAll(simulation);
      expect(
        (
          simulation.processors.get("stream-id") as unknown as {
            stream: Event[];
          }
        ).stream
      ).toContainEqual(
        expect.objectContaining({ tag: "simulation-clock-play" })
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
        { tag: "outside-clock-tick", timeStamp: 1003 },
        { tag: "simulation-clock-tick", tick: 1 },
      ],
    ],
  ])(
    "clock in play should emit simulation tick events when outside clock has advanced one or more entire time steps %j %j",
    (events, stream) => {
      let simulation = loadSave(blankSave());
      insertProcessor(simulation, createMemoryStream("stream-id"));
      insertProcessor(
        simulation,
        createClock(0, "clock-id", { speed: 1, tick: 0, mode: "play" })
      );

      simulation = pushEvents(events, simulation);
      simulation = processAll(simulation);

      // give the event stream an extra processing loop to receive any events emitted during the test
      simulation = processAll(simulation);
      expect(
        (
          simulation.processors.get("stream-id") as unknown as {
            stream: Event[];
          }
        ).stream
      ).toEqual(stream);
    }
  );
  test("simulation clock ticks interleaved with outside clock ticks over 'time'", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream("stream-id"));
    insertProcessor(
      simulation,
      createClock(0, "clock-id", { speed: 1, tick: 0, mode: "play" })
    );

    simulation = pushEvents(
      [
        { tag: "outside-clock-tick", timeStamp: 0 },
        { tag: "outside-clock-tick", timeStamp: 1 },
        { tag: "outside-clock-tick", timeStamp: 1002 },
      ],
      simulation
    );
    simulation = processAll(simulation);
    simulation = pushEvents(
      [
        { tag: "outside-clock-tick", timeStamp: 1003 },
        { tag: "outside-clock-tick", timeStamp: 3002 },
        { tag: "outside-clock-tick", timeStamp: 3003 },
      ],
      simulation
    );
    simulation = processAll(simulation);

    // give the event stream an extra processing loop to receive any events emitted during the test
    simulation = processAll(simulation);
    expect(
      (
        simulation.processors.get("stream-id") as unknown as {
          stream: Event[];
        }
      ).stream
    ).toEqual([
      { tag: "outside-clock-tick", timeStamp: 0 },
      { tag: "outside-clock-tick", timeStamp: 1 },
      { tag: "outside-clock-tick", timeStamp: 1002 },
      { tag: "simulation-clock-tick", tick: 1 },
      { tag: "outside-clock-tick", timeStamp: 1003 },
      { tag: "outside-clock-tick", timeStamp: 3002 },
      { tag: "outside-clock-tick", timeStamp: 3003 },
      { tag: "simulation-clock-tick", tick: 2 },
      { tag: "simulation-clock-tick", tick: 3 },
    ]);
  });
  test("star should output flux from processing simulation clock tick", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream("stream-id"));
    insertProcessor(simulation, createStar());
    simulation = pushEvents(
      [{ tag: "simulation-clock-tick", tick: 1 }],
      simulation
    );
    simulation = processAll(simulation);
    // give the event stream an extra processing loop to receive any events emitted during the test
    simulation = processAll(simulation);
    expect(
      (
        simulation.processors.get("stream-id") as unknown as {
          stream: Event[];
        }
      ).stream
    ).toEqual([
      { tag: "simulation-clock-tick", tick: 1 },
      expect.objectContaining({ tag: "star-flux-emission" }),
    ]);
  });
  test("collector should output energy from processing star flux emission", () => {
    let simulation = loadSave(blankSave());
    insertProcessor(simulation, createMemoryStream("stream-id"));
    insertProcessor(simulation, createCollector());
    simulation = pushEvents(
      [{ tag: "star-flux-emission", flux: 1 }],
      simulation
    );
    simulation = processAll(simulation);
    // give the event stream an extra processing loop to receive any events emitted during the test
    simulation = processAll(simulation);
    expect(
      (
        simulation.processors.get("stream-id") as unknown as {
          stream: Event[];
        }
      ).stream
    ).toEqual([
      { tag: "star-flux-emission", flux: 1 },
      { tag: "collector-energy-production", energy: 1 },
    ]);
  });
});
