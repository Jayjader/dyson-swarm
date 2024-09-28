import {
  Construct,
  constructionCosts,
  Resource,
  SOL_LUMINOSITY_W,
  tickConsumption,
  tickProduction,
} from "../gameRules";
import { isEditing, type Pause } from "../hud/types";
import type { BusEvent as BusEvent, Events } from "./events";
import {
  broadcastEvent,
  insertProcessor,
  processUntilSettled,
  tickClock,
} from "./index";
import type { Id } from "./processes";
import { type Clock, createClock } from "./processes/clock";
import {
  type CollectorManager,
  createCollectorManager,
} from "./processes/collector";
import { createFabricator, type Fabricator } from "./processes/fabricator";
import {
  createLauncherManager,
  type LauncherManager,
} from "./processes/launcher";
import { createMinerManager, type MinerManager } from "./processes/miner";
import { createPlanet } from "./processes/planet";
import type { PowerGrid } from "./processes/powerGrid";
import { createPowerGrid } from "./processes/powerGrid";
import { createRefinerManager, type RefinerManager } from "./processes/refiner";
import { createSwarm, type SatelliteSwarm } from "./processes/satelliteSwarm";
import {
  createFactoryManager,
  type SatelliteFactoryManager,
} from "./processes/satFactory";
import { createStar } from "./processes/star";
import { createStorage, type Storage } from "./processes/storage";
import { loadSave, type SaveState, versions } from "../save/save";
import { initInMemoryAdapters } from "../adapters";
import { describe, expect, test } from "vitest";

const LATEST_VERSION = versions[1];
function emptySave(): SaveState {
  return {
    events: [],
    inboxes: [],
    snapshots: [],
    sources: [],
    version: LATEST_VERSION,
  };
}

describe("event bus", () => {
  describe("clock should do nothing while outside clock has not advanced an entire time step but receives", () => {
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
    ])("%j", async (events) => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      await insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1 }),
        adapters,
      );
      for (const event of events) {
        simulation = await processUntilSettled(
          await broadcastEvent(simulation, event, adapters),
          adapters,
        );
      }
      expect(await adapters.events.read.getTickEventsRange(0)).not.toContain(
        expect.objectContaining({ tag: "simulation-clock-tick" }),
      );
    });
  });
  describe("clock should switch to play when receiving command event to do so", () => {
    test.each<BusEvent[][]>([
      [[{ tag: "command-simulation-clock-play", timeStamp: 1, afterTick: 1 }]],
    ])("%j", async (events) => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      await insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1, mode: "pause" }),
        adapters,
      );
      for (const event of events) {
        simulation = await processUntilSettled(
          await broadcastEvent(simulation, event, adapters),
          adapters,
        );
      }
      expect(await adapters.events.read.getTickEvents(2)).toContainEqual(
        expect.objectContaining({
          tag: "simulation-clock-play",
          beforeTick: 2,
        } as BusEvent),
      );
    });
  });
  test("clock should switch to pause when receiving command while in play", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, mode: "play" }),
      adapters,
    );
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "command-simulation-clock-pause",
          timeStamp: 1,
          afterTick: 1,
        },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(2)).toContainEqual(
      expect.objectContaining({
        tag: "simulation-clock-pause",
        beforeTick: 2,
      } as BusEvent),
    );
  });
  test("clock should switch to indirect pause when receiving command while in play", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, mode: "play" }),
      adapters,
    );
    simulation = await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "command-simulation-clock-indirect-pause",
          timeStamp: 1,
          afterTick: 0,
        },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(1)).toContainEqual(
      expect.objectContaining({
        tag: "simulation-clock-indirect-pause",
        beforeTick: 1,
      } as BusEvent),
    );
  });
  test("clock should switch to play when receiving command for indirect-resume while in indirect pause", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(
      simulation,
      createClock(0, "clock-0", { speed: 1, mode: "indirect-pause" }),
      adapters,
    );
    simulation = await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "command-simulation-clock-indirect-resume",
          timeStamp: 1,
          afterTick: 0,
        },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(1)).toContainEqual(
      expect.objectContaining({
        tag: "simulation-clock-indirect-resume",
        beforeTick: 1,
      } as BusEvent),
    );
  });
  describe("clock should ignore indirect command while already in pause", () => {
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
    ])("%j", async (event) => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      await insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1, mode: "pause" }),
        adapters,
      );
      await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
      expect(await adapters.events.read.getTickEvents(0)).not.toContainEqual(
        expect.objectContaining({
          // we're just looking at events emitted by the clock, so we can implicitly exclude all player commands (that start with "command-")
          tag: expect.stringMatching(/^simulation-clock/),
        }),
      );
    });
  });
  describe("clock should ignore direct command when indirectly paused", () => {
    test.each<BusEvent>([
      { tag: "command-simulation-clock-play", afterTick: 17, timeStamp: 1 },
      { tag: "command-simulation-clock-pause", afterTick: 17, timeStamp: 1 },
    ])("%j", async (event) => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      const clockId = "clock-0";
      await insertProcessor(
        simulation,
        createClock(0, clockId, {
          mode: "indirect-pause",
          tick: 17,
          speed: 2,
        }),
        adapters,
      );
      await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
      debugger;
      expect(
        (
          (
            await adapters.snapshots.getLastSnapshot(clockId)
          )[1] as Clock["data"]
        ).state,
      ).toEqual([{ tick: 17, speed: 2 }, "indirect-pause"]);

      expect(
        await adapters.events.read.getTickEventsRange(0),
      ).not.toContainEqual(
        expect.objectContaining({
          // we're just looking at events emitted by the clock, so we can implicitly exclude all player commands (that start with "command-")
          tag: expect.stringMatching(/^simulation-clock/),
        }),
      );
    });
  });

  test("clock should enter editing-speed state when receiving command to start editing speed", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const clock = createClock(0, "clock-0", {
      speed: 1,
      tick: 0,
      mode: "play",
    });
    await insertProcessor(simulation, clock, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "command-simulation-clock-start-editing-speed",
          afterTick: 0,
          timeStamp: 1,
        },
        adapters,
      ),
      adapters,
    );
    expect(
      isEditing(
        (
          (
            await adapters.snapshots.getLastSnapshot(clock.core.id)
          )[1] as Clock["data"]
        ).state,
      ),
    ).toBeTruthy();
    expect(await adapters.events.read.getTickEvents(1)).toContainEqual(
      expect.objectContaining({
        tag: "simulation-clock-editing-speed",
        beforeTick: 1,
      }),
    );
  });

  test("clock should change speed when receiving command while paused", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const clock = createClock(0, "clock-0", {
      speed: 1,
      tick: 0,
      mode: "pause",
    });
    await insertProcessor(simulation, clock, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "command-simulation-clock-set-speed",
          speed: 30,
          afterTick: 0,
          timeStamp: 1,
        },
        adapters,
      ),
      adapters,
    );
    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(clock.core.id)
        )[1] as Clock["data"]
      ).state,
    ).toEqual<Pause>([{ tick: 0, speed: 30 }, "pause"]);
    expect(await adapters.events.read.getTickEvents(1)).toContainEqual({
      tag: "simulation-clock-new-speed",
      speed: 30,
      beforeTick: 1,
    });
  });

  test("clock should emit ticks according to speed", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const clock = createClock(0, "clock-0", {
      speed: 10,
      tick: 0,
      mode: "play",
    });
    await insertProcessor(simulation, clock, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "outside-clock-tick",
          timeStamp: 1001,
        },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(1)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 1,
    });
    expect(await adapters.events.read.getTickEvents(2)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 2,
    });
    expect(await adapters.events.read.getTickEvents(3)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 3,
    });
    expect(await adapters.events.read.getTickEvents(4)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 4,
    });
    expect(await adapters.events.read.getTickEvents(5)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 5,
    });
    expect(await adapters.events.read.getTickEvents(6)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 6,
    });
    expect(await adapters.events.read.getTickEvents(7)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 7,
    });
    expect(await adapters.events.read.getTickEvents(8)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 8,
    });
    expect(await adapters.events.read.getTickEvents(9)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 9,
    });
    expect(await adapters.events.read.getTickEvents(10)).toContainEqual({
      tag: "simulation-clock-tick",
      tick: 10,
    });
  });

  describe("clock in play should emit simulation tick events when outside clock has advanced one or more entire time steps", () => {
    test("tickClock()", async () => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      await tickClock(1, simulation, adapters);
      expect(await adapters.events.read.getTickEvents(1)).toContainEqual({
        tag: "simulation-clock-tick",
        tick: 1,
      });
    });
    // todo: move these tests to a separate test file? and rewrite to not need to instantiate an entire simulation?
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
          { tag: "outside-clock-tick", timeStamp: 1001 },
          { tag: "outside-clock-tick", timeStamp: 1002 },
        ],
        { 1: [{ tag: "simulation-clock-tick", tick: 1 }] },
      ],
      [
        [
          { tag: "outside-clock-tick", timeStamp: 0 },
          { tag: "outside-clock-tick", timeStamp: 1 },
          { tag: "outside-clock-tick", timeStamp: 1001 },
        ],
        { 1: [{ tag: "simulation-clock-tick", tick: 1 }] },
      ],
    ] as const)("receive %j, emit %j", async (events, expectedStream) => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      await insertProcessor(
        simulation,
        createClock(0, "clock-0", { speed: 1, tick: 0, mode: "play" }),
        adapters,
      );

      for (const event of events) {
        simulation = await processUntilSettled(
          await broadcastEvent(simulation, event, adapters),
          adapters,
        );
      }
      for (const [tick, slice] of Object.entries(expectedStream)) {
        expect(
          await adapters.events.read.getTickEvents(parseInt(tick, 10)),
          // @ts-ignore slice is readonly which 'fails' the typechecking but otherwise works fine
        ).toEqual(expect.arrayContaining(slice));
      }
    });
  });

  test("star should output flux from processing simulation clock tick", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(simulation, createStar(), adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 1 },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(2)).toEqual([
      expect.objectContaining({ tag: "star-flux-emission", receivedTick: 2 }),
    ]);
  });

  test("collector should output power from processing star flux emission", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const count = 3;
    await insertProcessor(
      simulation,
      createCollectorManager({ count }),
      adapters,
    );
    for (const event of [
      { tag: "star-flux-emission", flux: SOL_LUMINOSITY_W, receivedTick: 2 },
      { tag: "simulation-clock-tick", tick: 2 },
    ] as const) {
      simulation = await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
    }
    expect(await adapters.events.read.getTickEvents(3)).toEqual([
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: expect.any(BigInt),
        receivedTick: 3,
      },
    ]);
  });
  test("collector and star over time", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(simulation, createStar(), adapters);
    await insertProcessor(
      simulation,
      createCollectorManager({ count: 1 }),
      adapters,
    );
    for (const event of [
      { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
      { tag: "simulation-clock-tick", tick: 2 }, // collector receives flux and produces power
    ] as BusEvent[]) {
      simulation = await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
    }
    expect(await adapters.events.read.getTickEvents(3)).toEqual([
      { tag: "star-flux-emission", flux: SOL_LUMINOSITY_W, receivedTick: 3 },
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: expect.any(BigInt),
        receivedTick: 3,
      },
    ]);
  });
  test("grid should receive power production after 3 ticks", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(simulation, createStar(), adapters);
    await insertProcessor(
      simulation,
      createCollectorManager({ count: 1 }),
      adapters,
    );
    const gridProc = createPowerGrid();
    await insertProcessor(simulation, gridProc, adapters);

    for (const event of [
      { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
      { tag: "simulation-clock-tick", tick: 2 }, // collector produces power from collected flux
      { tag: "simulation-clock-tick", tick: 3 }, // grid stores power received
    ] as BusEvent[]) {
      simulation = await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
    }

    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(gridProc.core.id)
        )[1] as PowerGrid["data"]
      ).stored,
    ).toBeGreaterThan(0n);
  });

  test("grid should supply power when drawn", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const powerGrid = createPowerGrid();
    powerGrid.data.stored = 10n;
    await insertProcessor(simulation, powerGrid, adapters);
    await processUntilSettled(
      await broadcastEvent(
        await broadcastEvent(
          simulation,
          {
            tag: "draw",
            resource: Resource.ELECTRICITY,
            amount: 1n,
            forId: "miner-1",
            receivedTick: 2,
          },
          adapters,
        ),
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );

    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(powerGrid.core.id)
        )[1] as PowerGrid["data"]
      ).stored,
    ).toEqual(9n);
    expect(await adapters.events.read.getTickEvents(3)).toContainEqual({
      tag: "supply",
      resource: Resource.ELECTRICITY,
      amount: 1n,
      receivedTick: 3,
      toId: "miner-1",
    });
  });

  test("miner should draw power on sim clock tick when working", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const miner = createMinerManager({ count: 1 });
    await insertProcessor(simulation, miner, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 1 },
        adapters,
      ),
      adapters,
    );

    expect(await adapters.events.read.getTickEvents(2)).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption.miner.get(Resource.ELECTRICITY),
      forId: miner.core.id,
      receivedTick: 2,
    });
  });
  test("miner should mine planet when supplied with power", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const miner = createMinerManager({ count: 1 });
    await insertProcessor(simulation, miner, adapters);
    await processUntilSettled(
      await broadcastEvent(
        await broadcastEvent(
          simulation,
          {
            tag: "supply",
            resource: Resource.ELECTRICITY,
            amount: tickConsumption.miner.get(Resource.ELECTRICITY)!,
            toId: miner.core.id,
            receivedTick: 4,
          },
          adapters,
        ),
        { tag: "simulation-clock-tick", tick: 4 },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(5)).toContainEqual({
      tag: "mine-planet-surface",
      minerCount: 1,
      receivedTick: 5,
    });
  });
  test("miner integration", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(simulation, createStar(), adapters);
    await insertProcessor(
      simulation,
      createCollectorManager({ count: 3 }),
      adapters,
    );
    await insertProcessor(simulation, createPowerGrid(), adapters);
    await insertProcessor(
      simulation,
      createMinerManager({ count: 1 }),
      adapters,
    );

    for (const event of [
      { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
      { tag: "simulation-clock-tick", tick: 2 }, // collectors produce power from collected flux
      { tag: "command-reset-circuit-breaker", afterTick: 2 }, // miner has been drawing on empty grid so circuit breaker needs to be reset
      { tag: "simulation-clock-tick", tick: 3 }, // grid stores power received & grid supplies power to miner
      { tag: "simulation-clock-tick", tick: 4 }, // miner mines planet
    ] as BusEvent[]) {
      simulation = await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
    }
    expect(await adapters.events.read.getTickEvents(5)).toContainEqual({
      tag: "mine-planet-surface",
      minerCount: 1,
      receivedTick: 5,
    });
  });

  test("planet should produce ore when mined", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const planet = createPlanet();
    await insertProcessor(simulation, planet, adapters);
    await processUntilSettled(
      await broadcastEvent(
        await broadcastEvent(
          simulation,
          {
            tag: "mine-planet-surface",
            minerCount: 1,
            receivedTick: 2,
          },
          adapters,
        ),
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(3)).toContainEqual({
      tag: "produce",
      resource: Resource.ORE,
      amount: tickProduction.miner.get(Resource.ORE),
      receivedTick: 3,
    });
  });

  describe("storage should store what is produced", () => {
    test.each<Exclude<Resource, Resource.ELECTRICITY>[]>([
      [Resource.ORE],
      [Resource.METAL],
      [Resource.PACKAGED_SATELLITE],
    ])("%j", async (resource) => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      const storage = createStorage(resource);
      await insertProcessor(simulation, storage, adapters);
      await processUntilSettled(
        await broadcastEvent(
          await broadcastEvent(
            simulation,
            {
              tag: "produce",
              resource,
              amount: 1n,
              receivedTick: 2,
            },
            adapters,
          ),
          { tag: "simulation-clock-tick", tick: 2 },
          adapters,
        ),
        adapters,
      );
      expect(
        (
          (
            await adapters.snapshots.getLastSnapshot(storage.core.id)
          )[1] as Storage<typeof resource>["data"]
        ).stored,
      ).toEqual(1n);
    });
  });

  describe("storage should supply when drawn from", () => {
    test.each<Exclude<Resource, Resource.ELECTRICITY>[]>([
      [Resource.ORE],
      [Resource.METAL],
      [Resource.PACKAGED_SATELLITE],
    ])("%j", async (resource) => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      const storage = createStorage(resource);
      storage.data.stored += 20n;
      await insertProcessor(simulation, storage, adapters);
      await processUntilSettled(
        await broadcastEvent(
          await broadcastEvent(
            simulation,
            {
              tag: "draw",
              resource,
              amount: 1n,
              forId: "random-id" as Id,
              receivedTick: 2,
            },
            adapters,
          ),
          { tag: "simulation-clock-tick", tick: 2 },
          adapters,
        ),
        adapters,
      );
      expect(await adapters.events.read.getTickEvents(3)).toContainEqual({
        tag: "supply",
        resource,
        amount: 1n,
        toId: "random-id" as Id,
        receivedTick: 3,
      });
      expect(
        (
          (
            await adapters.snapshots.getLastSnapshot(storage.core.id)
          )[1] as Storage<typeof resource>["data"]
        ).stored,
      ).toEqual(19n);
    });
  });

  test("refiner should draw power and ore on sim clock tick when working", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const refiner = createRefinerManager({ count: 1 });
    await insertProcessor(simulation, refiner, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 1 },
        adapters,
      ),
      adapters,
    );

    const eventsForTick2 = await adapters.events.read.getTickEvents(2);
    expect(eventsForTick2).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!,
      forId: refiner.core.id,
      receivedTick: 2,
    });
    expect(eventsForTick2).toContainEqual({
      tag: "draw",
      resource: Resource.ORE,
      amount: tickConsumption[Construct.REFINER].get(Resource.ORE)!,
      forId: refiner.core.id,
      receivedTick: 2,
    });
  });
  test("refiner should refine ore into metal when supplied with power (and ore)", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const refiner = createRefinerManager({ count: 1 });
    await insertProcessor(simulation, refiner, adapters);
    for (const event of [
      {
        tag: "supply",
        resource: Resource.ELECTRICITY,
        amount: tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!,
        toId: refiner.core.id,
        receivedTick: 15,
      },
      {
        tag: "supply",
        resource: Resource.ORE,
        amount: tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!,
        toId: refiner.core.id,
        receivedTick: 15,
      },
      { tag: "simulation-clock-tick", tick: 15 },
    ] as const) {
      simulation = await broadcastEvent(simulation, event, adapters);
    }
    await processUntilSettled(simulation, adapters);

    expect(await adapters.events.read.getTickEvents(16)).toContainEqual({
      tag: "produce",
      resource: Resource.METAL,
      amount: tickProduction[Construct.REFINER].get(Resource.METAL),
      receivedTick: 16,
    });
  });
  test("refiner integration", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(simulation, createPlanet(), adapters);
    const powerGrid = createPowerGrid();
    powerGrid.data.stored +=
      10n * tickConsumption.miner.get(Resource.ELECTRICITY)! +
      10n * tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY)!;
    await insertProcessor(simulation, powerGrid, adapters);
    await insertProcessor(
      simulation,
      createMinerManager({
        count: Number(
          tickConsumption[Construct.REFINER].get(Resource.ORE)! /
            tickProduction[Construct.MINER].get(Resource.ORE)!,
        ),
      }),
      adapters,
    );
    await insertProcessor(simulation, createStorage(Resource.ORE), adapters);
    await insertProcessor(
      simulation,
      createRefinerManager({ count: 1 }),
      adapters,
    );
    for (const event of [
      { tag: "simulation-clock-tick", tick: 1 }, // to make constructs draw power
      { tag: "simulation-clock-tick", tick: 2 }, // to make grid supply power
      { tag: "simulation-clock-tick", tick: 3 }, // to make miners mine (ie receive power)
      { tag: "simulation-clock-tick", tick: 4 }, // to make planet produce ore from being mined
      { tag: "simulation-clock-tick", tick: 5 }, // to make storage store ore received & supply ore to refiner
      { tag: "simulation-clock-tick", tick: 6 }, // to make refiner produce metal (ie receive power & ore)
    ] as BusEvent[]) {
      simulation = await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
    }
    expect(await adapters.events.read.getTickEvents(7)).toContainEqual({
      tag: "produce",
      resource: Resource.METAL,
      amount: tickProduction[Construct.REFINER].get(Resource.METAL),
      receivedTick: 7,
    });
  });

  test("factory should draw power and metal on simulation clock tick", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const factory = createFactoryManager({ count: 1 });
    await insertProcessor(simulation, factory, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );
    const eventsForTick3 = await adapters.events.read.getTickEvents(3);
    expect(eventsForTick3).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption.factory.get(Resource.ELECTRICITY)!,
      receivedTick: 3,
      forId: factory.core.id,
    });
    expect(eventsForTick3).toContainEqual({
      tag: "draw",
      resource: Resource.METAL,
      amount: tickConsumption.factory.get(Resource.METAL)!,
      receivedTick: 3,
      forId: factory.core.id,
    });
  });
  test("factory should produce packaged satellite when supplied with power and metal", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const factory = createFactoryManager({ count: 1 });
    await insertProcessor(simulation, factory, adapters);
    simulation = await broadcastEvent(
      await broadcastEvent(
        simulation,
        {
          tag: "supply",
          resource: Resource.ELECTRICITY,
          amount: tickConsumption.factory.get(Resource.ELECTRICITY)!,
          receivedTick: 2,
          toId: factory.core.id,
        },
        adapters,
      ),
      {
        tag: "supply",
        resource: Resource.METAL,
        amount: tickConsumption.factory.get(Resource.METAL)!,
        receivedTick: 2,
        toId: factory.core.id,
      },
      adapters,
    );
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(3)).toContainEqual({
      tag: "produce",
      resource: Resource.PACKAGED_SATELLITE,
      amount: tickProduction.factory.get(Resource.PACKAGED_SATELLITE),
      receivedTick: 3,
    });
  });
  test("factory integration", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);

    const powerGrid = createPowerGrid();
    powerGrid.data.stored +=
      10n * tickConsumption.factory.get(Resource.ELECTRICITY)!;
    await insertProcessor(simulation, powerGrid, adapters);
    const metalStorage = createStorage(Resource.METAL);
    metalStorage.data.stored +=
      10n * tickConsumption.factory.get(Resource.METAL)!;
    await insertProcessor(simulation, metalStorage, adapters);
    await insertProcessor(
      simulation,
      createFactoryManager({ count: 1 }),
      adapters,
    );
    for (const event of [
      { tag: "simulation-clock-tick", tick: 1 }, // to make factory draw power and metal
      { tag: "simulation-clock-tick", tick: 2 }, // to make grid supply power and storage supply metal
      { tag: "simulation-clock-tick", tick: 3 }, // to make factory produce packaged satellite
    ] as BusEvent[]) {
      simulation = await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
    }

    expect(await adapters.events.read.getTickEvents(4)).toContainEqual({
      tag: "produce",
      resource: Resource.PACKAGED_SATELLITE,
      amount: tickProduction.factory.get(Resource.PACKAGED_SATELLITE),
      receivedTick: 4,
    });
  });

  test("launcher should draw power when not fully charged", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const launcher = createLauncherManager({ count: 1 });
    launcher.data.charge = 0n;
    await insertProcessor(simulation, launcher, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(3)).toContainEqual({
      tag: "draw",
      resource: Resource.ELECTRICITY,
      amount: tickConsumption.launcher.get(Resource.ELECTRICITY),
      forId: launcher.core.id,
      receivedTick: 3,
    });
  });
  test("launcher should draw packaged satellite when fully charged", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const launcher = createLauncherManager({ count: 1 });
    launcher.data.charge = tickConsumption.launcher.get(Resource.ELECTRICITY)!;
    await insertProcessor(simulation, launcher, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(3)).toContainEqual({
      tag: "draw",
      resource: Resource.PACKAGED_SATELLITE,
      amount: tickConsumption.launcher.get(Resource.PACKAGED_SATELLITE),
      forId: launcher.core.id,
      receivedTick: 3,
    });
  });
  test("launcher should launch supplied satellite on sim clock tick when fully charged", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const launcher = createLauncherManager({ count: 1 });
    launcher.data.charge = tickConsumption.launcher.get(Resource.ELECTRICITY)!;
    await insertProcessor(simulation, launcher, adapters);
    await processUntilSettled(
      await broadcastEvent(
        await broadcastEvent(
          simulation,
          {
            tag: "supply",
            resource: Resource.PACKAGED_SATELLITE,
            amount: tickConsumption.launcher.get(Resource.PACKAGED_SATELLITE)!,
            receivedTick: 2,
            toId: launcher.core.id,
          },
          adapters,
        ),
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(3)).toContainEqual({
      tag: "launch-satellite",
      receivedTick: 3,
      count: 1,
    });
  });
  test("launcher should empty charge when launching satellite", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const launcher = createLauncherManager({ count: 1 });
    launcher.data.charge = tickConsumption.launcher.get(Resource.ELECTRICITY)!;
    await insertProcessor(simulation, launcher, adapters);
    await processUntilSettled(
      await broadcastEvent(
        await broadcastEvent(
          simulation,
          {
            tag: "supply",
            resource: Resource.PACKAGED_SATELLITE,
            amount: tickConsumption.launcher.get(Resource.PACKAGED_SATELLITE)!,
            receivedTick: 2,
            toId: launcher.core.id,
          },
          adapters,
        ),
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );
    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(launcher.core.id)
        )[1] as LauncherManager["data"]
      ).charge,
    ).toEqual(0n);
  });

  test("swarm should increase in count when satellite is launched", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const swarm = createSwarm({ count: 0 });
    await insertProcessor(simulation, swarm, adapters);
    await processUntilSettled(
      await broadcastEvent(
        await broadcastEvent(
          simulation,
          {
            tag: "launch-satellite",
            receivedTick: 2,
          },
          adapters,
        ),
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );
    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(swarm.core.id)
        )[1] as SatelliteSwarm["data"]
      ).count,
    ).toEqual(1);
  });
  test("swarm should reflect energy flux emitted by star", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(simulation, createStar(), adapters);
    const count = 3;
    await insertProcessor(simulation, createSwarm({ count }), adapters);
    simulation = await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 2 },
        adapters,
      ),
      adapters,
    );
    simulation = await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 3 },
        adapters,
      ),
      adapters,
    );
    const tickEvents = await adapters.events.read.getTickEvents(4);
    expect(tickEvents).toContainEqual({
      tag: "satellite-flux-reflection",
      flux: expect.any(BigInt),
      receivedTick: 4,
    });
    expect(
      (
        tickEvents.find(
          (e) => e.tag === "satellite-flux-reflection",
        )! as Events<"satellite-flux-reflection">
      ).flux,
    ).toBeGreaterThan(0);
  });
  test("collector should produce energy when processing satellite reflected emission", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const count = 3;
    await insertProcessor(
      simulation,
      createCollectorManager({ count }),
      adapters,
    );
    for (const event of [
      {
        tag: "satellite-flux-reflection",
        flux: SOL_LUMINOSITY_W,
        receivedTick: 2,
      },
      { tag: "simulation-clock-tick", tick: 2 },
    ] as const) {
      simulation = await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
    }
    expect(await adapters.events.read.getTickEvents(3)).toEqual([
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: expect.any(BigInt),
        receivedTick: 3,
      },
    ]);
  });
  test("swarm integration", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    await insertProcessor(simulation, createStar(), adapters);
    await insertProcessor(simulation, createSwarm({ count: 1 }), adapters);
    await insertProcessor(
      simulation,
      createCollectorManager({ count: 1 }),
      adapters,
    );
    const powerGrid = createPowerGrid({ stored: 0n });
    await insertProcessor(simulation, powerGrid, adapters);
    for (const event of [
      { tag: "simulation-clock-tick", tick: 1 }, // star emits flux
      { tag: "simulation-clock-tick", tick: 2 }, // swarm reflects flux, collector produces power from collected flux (and star emits again)
      { tag: "simulation-clock-tick", tick: 3 }, // collector produces from flux from star and swarm
      { tag: "simulation-clock-tick", tick: 4 }, // grid stores power produced during previous tick
    ] as BusEvent[]) {
      simulation = await processUntilSettled(
        await broadcastEvent(simulation, event, adapters),
        adapters,
      );
    }
    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(powerGrid.core.id)
        )[1] as PowerGrid["data"]
      ).stored,
    ).toBeGreaterThan(0n);
  });

  describe("fabricator should draw materials and power for current job on simulation clock tick when a job exists", () => {
    test.each<Construct>([...Object.keys(constructionCosts)] as Construct[])(
      "(job: build %s)",
      async (construct) => {
        const adapters = initInMemoryAdapters();
        let simulation = await loadSave(emptySave(), adapters);
        simulation = adapters.setup(simulation);
        const fabricator = createFabricator();
        fabricator.data.job = construct;
        await insertProcessor(simulation, fabricator, adapters);
        await processUntilSettled(
          await broadcastEvent(
            simulation,
            { tag: "simulation-clock-tick", tick: 5 },
            adapters,
          ),
          adapters,
        );
        expect(await adapters.events.read.getTickEvents(6)).toEqual(
          [...constructionCosts[construct]].map(([resource, amount]) => ({
            tag: "draw",
            resource,
            amount,
            forId: fabricator.core.id,
            receivedTick: 6,
          })),
        );
      },
    );
  });
  describe("fabricator should emit construct-fabricated when supplied with the needed materials and power and it is the current job", () => {
    test.each<Construct>([...Object.keys(constructionCosts)] as Construct[])(
      "construct: %s",
      async (construct) => {
        const adapters = initInMemoryAdapters();
        let simulation = await loadSave(emptySave(), adapters);
        simulation = adapters.setup(simulation);
        const fabricator = createFabricator();
        fabricator.data.job = construct;
        await insertProcessor(simulation, fabricator, adapters);

        for (const [resource, amount] of constructionCosts[
          construct
        ].entries()) {
          simulation = await broadcastEvent(
            simulation,
            {
              tag: "supply",
              resource,
              amount,
              toId: fabricator.core.id,
              receivedTick: 5,
            },
            adapters,
          );
        }
        await processUntilSettled(
          await broadcastEvent(
            simulation,
            { tag: "simulation-clock-tick", tick: 5 },
            adapters,
          ),
          adapters,
        );
        expect(await adapters.events.read.getTickEvents(6)).toContainEqual({
          tag: "construct-fabricated",
          construct,
          receivedTick: 6,
        });
      },
    );
  });

  describe("total construct count should increase by 1 when construct-fabricated received", () => {
    test.each<Construct>([
      Construct.SOLAR_COLLECTOR,
      Construct.MINER,
      Construct.REFINER,
      Construct.SATELLITE_FACTORY,
      Construct.SATELLITE_LAUNCHER,
    ])("construct: %s", async (construct) => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      for (const createManager of [
        createCollectorManager,
        createMinerManager,
        createRefinerManager,
        createFactoryManager,
        createLauncherManager,
      ]) {
        await insertProcessor(
          simulation,
          createManager({ count: 0 }),
          adapters,
        );
      }
      await processUntilSettled(
        await broadcastEvent(
          await broadcastEvent(
            simulation,
            {
              tag: "construct-fabricated",
              construct,
              receivedTick: 1,
            },
            adapters,
          ),
          { tag: "simulation-clock-tick", tick: 1 },
          adapters,
        ),
        adapters,
      );
      const manager = (
        await adapters.snapshots.getLastSnapshot(`${construct}-0`)
      )[1] as (
        | CollectorManager
        | MinerManager
        | RefinerManager
        | SatelliteFactoryManager
        | LauncherManager
      )["data"];
      expect(manager.count).toEqual(1);
    });
  });
  test("fabricator should clear internal job when receiving command to do so", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const fabricator = createFabricator();
    fabricator.data.job = Construct.SATELLITE_FACTORY;
    await insertProcessor(simulation, fabricator, adapters);
    // act
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "command-clear-fabricator-job",
          afterTick: 1,
          timeStamp: 67892,
        },
        adapters,
      ),
      adapters,
    );
    // assert
    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(fabricator.core.id)
        )[1] as Fabricator["data"]
      ).job,
    ).toBeNull();
  });

  test("grid should trip breaker when receiving more draw than it can supply in a given simulation clock tick", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    const grid = createPowerGrid();
    grid.data.stored = 0n;
    grid.data.breakerTripped = false;
    await insertProcessor(simulation, grid, adapters);
    simulation = await broadcastEvent(
      simulation,
      {
        tag: "draw",
        resource: Resource.ELECTRICITY,
        amount: 1n,
        receivedTick: 48,
        forId: "some-test-id" as Id,
      },
      adapters,
    );
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 48 },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(48)).toContainEqual({
      tag: "circuit-breaker-tripped",
      onTick: 48,
    });
    const gridUpdated = (
      await adapters.snapshots.getLastSnapshot(grid.core.id)
    )[1] as PowerGrid["data"];
    expect(gridUpdated.breakerTripped).toBeTruthy();
    expect(gridUpdated.stored).toEqual(0n);
  });
  test("tripped power grid should supply nothing (but still store production)", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const grid = createPowerGrid();
    grid.data.breakerTripped = true;
    grid.data.stored = 100n;
    await insertProcessor(simulation, grid, adapters);
    simulation = await broadcastEvent(
      await broadcastEvent(
        simulation,
        {
          tag: "draw",
          resource: Resource.ELECTRICITY,
          amount: 1n,
          receivedTick: 48,
          forId: "some-test-id" as Id,
        },
        adapters,
      ),
      {
        tag: "produce",
        resource: Resource.ELECTRICITY,
        amount: 4n,
        receivedTick: 48,
      },
      adapters,
    );
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        { tag: "simulation-clock-tick", tick: 48 },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(48)).not.toContainEqual({
      tag: "supply",
      resource: Resource.ELECTRICITY,
      amount: expect.any(Number),
      toId: expect.any(String),
      receivedTick: expect.any(Number),
    });
    const gridUpdated = (
      await adapters.snapshots.getLastSnapshot(grid.core.id)
    )[1] as PowerGrid["data"];
    expect(gridUpdated.breakerTripped).toBeTruthy();
  });
  test("grid should fulfill command to reset tripped circuit breaker", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const grid = createPowerGrid();
    grid.data.breakerTripped = true;
    await insertProcessor(simulation, grid, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "command-reset-circuit-breaker",
          afterTick: 77,
          timeStamp: Math.floor(150 * Math.random()),
        },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(78)).toContainEqual({
      tag: "circuit-breaker-reset",
      onTick: 78,
    });
    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(grid.core.id)
        )[1] as PowerGrid["data"]
      ).breakerTripped,
    ).toBeFalsy();
  });
  test("grid should fulfill command to trip breaker", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const grid = createPowerGrid();
    grid.data.breakerTripped = false;
    await insertProcessor(simulation, grid, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "command-trip-circuit-breaker",
          afterTick: 77,
          timeStamp: Math.floor(150 * Math.random()),
        },
        adapters,
      ),
      adapters,
    );
    expect(await adapters.events.read.getTickEvents(78)).toContainEqual({
      tag: "circuit-breaker-tripped",
      onTick: 78,
    });
    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(grid.core.id)
        )[1] as PowerGrid["data"]
      ).breakerTripped,
    ).toBeTruthy();
  });

  describe("working count should adjust when receiving command to change it", () => {
    test.each<Exclude<Construct, Construct.SOLAR_COLLECTOR>>([
      Construct.MINER,
      Construct.REFINER,
      Construct.SATELLITE_FACTORY,
      Construct.SATELLITE_LAUNCHER,
    ])("construct: %s", async (construct) => {
      const adapters = initInMemoryAdapters();
      let simulation = await loadSave(emptySave(), adapters);
      simulation = adapters.setup(simulation);
      for (const createManager of [
        createMinerManager,
        createRefinerManager,
        createFactoryManager,
        createLauncherManager,
      ]) {
        await insertProcessor(
          simulation,
          createManager({ count: 1 }),
          adapters,
        );
      }
      await processUntilSettled(
        await broadcastEvent(
          simulation,
          {
            tag: "command-set-working-count",
            construct,
            count: 0,
            afterTick: 1,
            timeStamp: Math.floor(150 * Math.random()),
          },
          adapters,
        ),
        adapters,
      );
      const manager = (
        await adapters.snapshots.getLastSnapshot(`${construct}-0`)
      )[1] as (
        | MinerManager
        | RefinerManager
        | SatelliteFactoryManager
        | LauncherManager
      )["data"];
      expect(manager.working).toEqual(0);
      expect(await adapters.events.read.getTickEvents(2)).toContainEqual({
        tag: "working-count-set",
        construct,
        count: 0,
        beforeTick: 2,
      } as BusEvent);
    });
  });

  test("fabricator job queue state should update when receiving command to do so", async () => {
    const adapters = initInMemoryAdapters();
    let simulation = await loadSave(emptySave(), adapters);
    simulation = adapters.setup(simulation);
    const fabricator = createFabricator();
    await insertProcessor(simulation, fabricator, adapters);
    await processUntilSettled(
      await broadcastEvent(
        simulation,
        {
          tag: "command-set-fabricator-queue",
          queue: [{ building: Construct.SOLAR_COLLECTOR }],
          afterTick: 17777777,
          timeStamp: Math.floor(150 * Math.random()),
        },
        adapters,
      ),
      adapters,
    );
    expect(
      (
        (
          await adapters.snapshots.getLastSnapshot(fabricator.core.id)
        )[1] as Fabricator["data"]
      ).queue,
    ).toEqual([{ building: Construct.SOLAR_COLLECTOR }]);
    expect(await adapters.events.read.getTickEvents(17777778)).toContainEqual({
      tag: "fabricator-queue-set",
      queue: [{ building: Construct.SOLAR_COLLECTOR }],
      beforeTick: 17777778,
    });
  });
});
