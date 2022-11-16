import type { SubscriptionsFor } from "./index";
import {
  blankSave,
  broadcastEvent,
  loadSave,
  processUntilSettled,
  SUBSCRIPTIONS,
} from "./index";
import type { Event, Events } from "./events";
import type { BuildOrder, SingleBuildOrder } from "../types";
import type { Clock as ClockState } from "../time/store";
import { getPrimitive, isIndirectPause, isPause, isPlay } from "../time/store";
import { Resource, tickConsumption, tickProduction } from "../gameStateStore";

type ProcessorCore<Tag extends keyof typeof SUBSCRIPTIONS> = {
  tag: Tag;
  id: `${Tag}-${number}`;
  incoming: Events<SubscriptionsFor<Tag>>[];
};
type EventProcessor<
  Tag extends string,
  Data extends undefined | object = undefined
> = Tag extends keyof typeof SUBSCRIPTIONS
  ? Data extends undefined
    ? ProcessorCore<Tag>
    : { data: Data } & ProcessorCore<Tag>
  : never;

export type EventStream = EventProcessor<
  "stream",
  {
    received: Events<SubscriptionsFor<"stream">>[];
  }
>;

type Clock = EventProcessor<
  "clock",
  {
    state: ClockState;
    lastOutsideTickProvokingSimulationTick: DOMHighResTimeStamp;
    received: Events<
      Exclude<SubscriptionsFor<"clock">, "simulation-clock-tick">
    >[];
  }
>;

type Star = EventProcessor<"star", { mass: number }>;
type Planet = EventProcessor<
  "planet",
  {
    mass: number;
    received: Events<
      Exclude<SubscriptionsFor<"planet">, "simulation-clock-tick">
    >[];
  }
>;
type Collector = EventProcessor<
  "collector",
  {
    received: Events<
      Exclude<SubscriptionsFor<"collector">, "simulation-clock-tick">
    >[];
  }
>;
type PowerGrid = EventProcessor<
  "power grid",
  {
    stored: number;
    breakerTripped: boolean;
    received: Events<
      Exclude<SubscriptionsFor<"power grid">, "simulation-clock-tick">
    >[];
  }
>;
type Storage<R extends string> = EventProcessor<
  `storage-${R}`,
  {
    stored: number;
    received: Events<
      Exclude<SubscriptionsFor<`storage-${R}`>, "simulation-clock-tick">
    >[];
  }
>;
type Miner = EventProcessor<
  "miner",
  {
    working: boolean;
    received: Events<
      Exclude<SubscriptionsFor<"miner">, "simulation-clock-tick">
    >[];
  }
>;

export type Processor =
  | EventStream
  | Clock
  | Star
  | Planet
  | Collector
  | PowerGrid
  | Miner
  | Storage<Exclude<Resource, Resource.ELECTRICITY>>;
export type Id = Processor["id"];

export function createMemoryStream(
  id: EventStream["id"] = "stream-0"
): EventStream {
  return {
    id,
    incoming: [],
    tag: "stream",
    data: { received: [] },
  };
}
export function memoryStreamProcess(stream: EventStream): EventStream {
  stream.data.received.push(...stream.incoming);
  stream.incoming = [];
  return stream;
}

const clockDefaults = { mode: "pause", speed: 1, tick: 0 } as const;
export function createClock(
  lastOutsideTickProvokingSimulationTick: number,
  id: Clock["id"] = "clock-0",
  options: Partial<{
    speed: number;
    tick: number;
    mode: "play" | "pause" | "indirect-pause";
  }> = {}
): Clock {
  const mode = options?.mode ?? clockDefaults.mode;
  const speed = options?.speed ?? clockDefaults.speed;
  const tick = options?.tick ?? clockDefaults.tick;
  const primitive = { speed, tick };
  const state: ClockState = mode === "play" ? [primitive] : [mode, primitive];
  return {
    id,
    incoming: [],
    tag: "clock",
    data: {
      state,
      lastOutsideTickProvokingSimulationTick,
      received: [],
    },
  };
}
export function clockProcess(clock: Clock): [Clock, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = clock.incoming.shift())) {
    switch (event.tag) {
      case "command-simulation-clock-play":
        if (isPause(clock.data.state)) {
          clock.data.state = [clock.data.state[1]];
          emitted.push({ tag: "simulation-clock-play" });
        }
        break;
      case "command-simulation-clock-pause":
        if (isPlay(clock.data.state)) {
          clock.data.state = ["pause", clock.data.state[0]];
          emitted.push({ tag: "simulation-clock-pause" });
        }
        break;
      case "command-simulation-clock-indirect-pause":
        if (isPlay(clock.data.state)) {
          clock.data.state = ["indirect-pause", clock.data.state[0]];
          emitted.push({ tag: "simulation-clock-indirect-pause" });
        }
        break;
      case "command-simulation-clock-indirect-resume":
        if (isIndirectPause(clock.data.state)) {
          clock.data.state = [clock.data.state[1]];
          emitted.push({ tag: "simulation-clock-indirect-resume" });
        }
        break;
      case "outside-clock-tick":
        if (!isPlay(clock.data.state)) {
          break;
        }
        const { speed, tick } = getPrimitive(clock.data.state);
        const timeElapsed = Math.floor(
          event.timeStamp - clock.data.lastOutsideTickProvokingSimulationTick
        );
        const timeStep = Math.floor(1000 / speed);
        const ticks = Math.floor(timeElapsed / timeStep);
        if (ticks <= 0) {
          break;
        }
        clock.data.lastOutsideTickProvokingSimulationTick = event.timeStamp;
        clock.data.state = [
          {
            speed,
            tick: tick + ticks,
          },
        ];
        for (let index = 1; index <= ticks; index++)
          emitted.push({
            tag: "simulation-clock-tick",
            tick: tick + index,
          });
        break;
    }
  }
  return [clock, emitted];
}

export function createStar(
  id: Star["id"] = "star-0",
  mass: number = 1.989e30
): Star {
  return { id, incoming: [], tag: "star", data: { mass } };
}
export function starProcess(star: Star): [Star, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = star.incoming.shift())) {
    switch (event.tag) {
      case "simulation-clock-tick":
        emitted.push({
          tag: "star-flux-emission",
          flux: 1,
          receivedTick: event.tick + 1,
        });
        break;
    }
  }
  return [star, emitted];
}

export function createCollector(
  id: Collector["id"] = "collector-0"
): Collector {
  return {
    id,
    incoming: [],
    tag: "collector",
    data: { received: [] },
  };
}
export function collectorProcess(c: Collector): [Collector, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = c.incoming.shift())) {
    switch (event.tag) {
      case "star-flux-emission":
        c.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const produced = c.data.received.reduce((sum, e) => sum + e.flux, 0);
        c.data.received = [];
        emitted.push({
          tag: "collector-power-production",
          power: produced,
          receivedTick: event.tick + 1,
        });
        break;
    }
  }
  return [c, emitted];
}

export function createPowerGrid(
  id: PowerGrid["id"] = "power grid-0"
): PowerGrid {
  return {
    id,
    incoming: [],
    tag: "power grid",
    data: {
      stored: 0,
      breakerTripped: false,
      received: [],
    },
  };
}
export function processPowerGrid(grid: PowerGrid): [PowerGrid, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = grid.incoming.shift())) {
    switch (event.tag) {
      case "collector-power-production":
      case "draw-power":
        grid.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const [produced, toSupply] = grid.data.received.reduce(
          (accu, next) =>
            next.tag === "collector-power-production"
              ? [accu[0] + next.power, accu[1]]
              : [accu[0], accu[1].add(next)],
          [0, new Set<Events<"draw-power">>()]
        );
        grid.data.stored += produced;
        const totalRequestedSupply = Array.from(toSupply).reduce(
          (accu, next) => accu + next.power,
          0
        );
        if (grid.data.stored >= totalRequestedSupply) {
          grid.data.stored -= totalRequestedSupply;
          for (let drawRequest of toSupply) {
            emitted.push({
              tag: "supply-power",
              power: drawRequest.power,
              receivedTick: event.tick + 1,
              toId: drawRequest.forId,
            });
          }
        }
        grid.data.received = [];
        break;
    }
  }
  return [grid, emitted];
}

export function createMiner(id: Miner["id"] = "miner-0"): Miner {
  return {
    id,
    tag: "miner",
    incoming: [],
    data: {
      working: true,
      received: [],
    },
  };
}
export function processMiner(miner: Miner): [Miner, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = miner.incoming.shift())) {
    switch (event.tag) {
      case "supply-power":
        if (event.toId === miner.id) {
          miner.data.received.push(event);
        }
        break;
      case "simulation-clock-tick":
        emitted.push({
          tag: "draw-power",
          power: tickConsumption.miner.get(Resource.ELECTRICITY)!,
          forId: miner.id,
          receivedTick: event.tick + 1,
        });
        // spend all the power we were supplied on mining (if excess, waste it)
        const supplied = miner.data.received.reduce(
          (sum, e) => sum + e.power,
          0
        );
        miner.data.received = [];
        if (supplied > 0) {
          emitted.push({
            tag: "mine-planet-surface",
            receivedTick: event.tick + 1,
          });
        }
    }
  }
  return [miner, emitted];
}

export function createPlanet(
  id: Planet["id"] = "planet-0",
  mass = 100
): Planet {
  return { id, tag: "planet", incoming: [], data: { mass, received: [] } };
}
export function planetProcess(planet: Planet): [Planet, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = planet.incoming.shift())) {
    switch (event.tag) {
      case "mine-planet-surface":
        planet.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const totalOreMined = Math.min(
          planet.data.mass, // we don't want to mine more ore than the planet has mass!
          planet.data.received.length * tickProduction.miner.get(Resource.ORE)!
        );
        if (totalOreMined > 0) {
          planet.data.mass -= totalOreMined;
          emitted.push({
            tag: "produce-ore",
            amount: totalOreMined,
            receivedTick: event.tick + 1,
          });
        }
        break;
    }
  }
  return [planet, emitted];
}

export function createStorage<R extends Exclude<Resource, Resource.ELECTRICITY>>(
  resource: R,
  customId?: Storage<R>["id"]
): Storage<R> {
  const tag = `storage-${resource}`;
  const id = customId ?? `${tag}-0`;
  return {
    id,
    tag,
    incoming: [],
    data: { stored: 0, received: [] },
  } as unknown as Storage<R>;
}
export function oreStorageProcess(
  storage: Storage<Resource.ORE>
): [Storage<Resource.ORE>, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = storage.incoming.shift())) {
    switch (event.tag) {
      case "produce-ore":
        storage.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const totalOreReceived = storage.data.received.reduce(
          (sum, e) => sum + (e as Events<"produce-ore">).amount,
          0
        );
        storage.data.stored += totalOreReceived;
        storage.data.received = [];
    }
  }
  return [storage, emitted];
}
export function metalStorageProcess(
    storage: Storage<Resource.METAL>
): [Storage<Resource.METAL>, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = storage.incoming.shift())) {
    switch (event.tag) {
      case "produce-metal":
        storage.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const totalMetalReceived = storage.data.received.reduce(
            (sum, e) => sum + (e as Events<"produce-metal">).amount,
            0
        );
        storage.data.stored += totalMetalReceived;
        storage.data.received = [];
    }
  }
  return [storage, emitted];
}
export function satelliteStorageProcess(
    storage: Storage<Resource.PACKAGED_SATELLITE>
): [Storage<Resource.PACKAGED_SATELLITE>, Event[]] {
  let event;
  const emitted = [] as Event[];
  while ((event = storage.incoming.shift())) {
    switch (event.tag) {
      case "produce-satellite":
        storage.data.received.push(event);
        break;
      case "simulation-clock-tick":
        const totalSatellitesReceived = storage.data.received.reduce(
            (sum, e) => sum + (e as Events<"produce-satellite">).amount,
            0
        );
        storage.data.stored += totalSatellitesReceived;
        storage.data.received = [];
    }
  }
  return [storage, emitted];
}

/* ================================= */
function App() {
  const savedState = blankSave();
  let simulation = loadSave(savedState, {
    enforce: { clock: true, stream: true },
  });

  let clockFrame: number;

  function outsideClockLoop(timeStamp: DOMHighResTimeStamp) {
    simulation = processUntilSettled(
      broadcastEvent(simulation, { tag: "outside-clock-tick", timeStamp })
    );
    clockFrame = window.requestAnimationFrame(outsideClockLoop);
  }
  clockFrame = window.requestAnimationFrame(outsideClockLoop);

  return () => window.cancelAnimationFrame(clockFrame);
}

/* ================================= */

type Satellite = { tag: "satellite"; launched: boolean } & Processor;
type Fabricator = {
  tag: "fabricator";
  working: boolean;
  job: SingleBuildOrder;
  queue: BuildOrder[];
} & Processor;
type Refiner = { tag: "refiner"; working: boolean } & Processor;
type Factory = { tag: "factory"; working: boolean } & Processor;
type Launcher = { tag: "launcher"; working: boolean } & Processor;
