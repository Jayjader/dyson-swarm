import type { BuildOrder, SingleBuildOrder } from "./types";
import type { Resource } from "./gameStateStore";
import type { Clock as ClockState } from "./time/store";
import {
  getPrimitive,
  isIndirectPause,
  isPause,
  isPlay,
  setPrimitive,
} from "./time/store";
import { includes } from "./types";

export type Event =
  | { tag: "outside-clock-tick"; timeStamp: DOMHighResTimeStamp }
  | { tag: "simulation-clock-tick"; tick: number }
  | { tag: "command-simulation-clock-play" }
  | { tag: "simulation-clock-play" }
  | { tag: "star-flux-emission"; flux: number }
  | { tag: "collector-energy-production"; energy: number };
type EventTag = Event["tag"];
type EventProcessing = {
  id: string;
  incoming: Event[];
  received: Event[];
};
type EventStream = { tag: "stream" } & EventProcessing;
type Clock = {
  tag: "clock";
  state: ClockState;
  lastOutsideTickProvokingSimulationTick: DOMHighResTimeStamp;
} & EventProcessing;

type Star = { tag: "star"; mass: number } & EventProcessing;
type Planet = { tag: "planet"; mass: number } & EventProcessing;
type Collector = { tag: "collector" } & EventProcessing;

type EventProcessor = EventStream | Clock | Star | Planet | Collector;
type Id = EventProcessor["id"];

type EventBus = {
  subscriptions: Map<Event["tag"], Set<Id>>;
};
type Simulation = {
  bus: EventBus;
  processors: Map<Id, EventProcessor>;
};

export function insertProcessor(sim: Simulation, p: EventProcessor) {
  SUBSCRIPTIONS[p.tag].forEach((eventTag) =>
    sim.bus.subscriptions.set(
      eventTag,
      (sim.bus.subscriptions.get(eventTag) ?? new Set()).add(p.id)
    )
  );
  sim.processors.set(p.id, p);
}

export function pushEvents(events: Event[], sim: Simulation): Simulation {
  const perProcessor = new Map<Id, Event[]>();
  for (let event of events) {
    const subs = sim.bus.subscriptions.get(event.tag);
    for (let s of subs ?? []) {
      const incoming = perProcessor.get(s) ?? [];
      incoming.push(event);
      perProcessor.set(s, incoming);
    }
  }
  for (let [id, events_] of perProcessor) {
    const processor = sim.processors.get(id);
    if (processor) {
      processor.incoming.push(...events_);
      sim.processors.set(id, processor);
    }
  }
  return { bus: sim.bus, processors: sim.processors };
}

export function createMemoryStream(
  id: string = "memory-event-stream-id"
): EventStream {
  return {
    id,
    incoming: [],
    received: [],
    tag: "stream",
    stream: [],
  } as EventStream;
}
function memoryStreamProcess(stream: EventStream): EventStream {
  (stream as unknown as { stream: Event[] }).stream.push(...stream.received);
  return stream;
}

const clockDefaults = { mode: "pause", speed: 1, tick: 0 } as const;
export function createClock(
  lastOutsideTickProvokingSimulationTick: number,
  id: string = "clock-id",
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
    received: [],
    tag: "clock",
    state,
    lastOutsideTickProvokingSimulationTick,
  };
}
function clockProcess(clock: Clock): [Clock, Event[]] {
  return clock.received.reduce<[Clock, Event[]]>(
    ([clock_, emitted], event) => {
      if (!includes(SUBSCRIPTIONS[clock_.tag], event.tag)) {
        return [clock_, emitted];
      }
      switch (event.tag) {
        case "command-simulation-clock-play":
          if (isPause(clock_.state)) {
            clock_.state = [clock_.state[1]];
            emitted.push({ tag: "simulation-clock-play" });
          }
          return [clock_, emitted];
        case "outside-clock-tick":
          if (!isPlay(clock_.state)) {
            return [clock_, emitted];
          }
          const { speed, tick } = getPrimitive(clock_.state);
          const timeElapsed = Math.floor(
            event.timeStamp - clock_.lastOutsideTickProvokingSimulationTick
          );
          const timeStep = Math.floor(1000 / speed);
          const ticks = Math.floor(timeElapsed / timeStep);
          if (ticks <= 0) {
            return [clock_, emitted];
          }
          clock_.lastOutsideTickProvokingSimulationTick = event.timeStamp;
          clock_.state = [
            {
              speed,
              tick: tick + ticks,
            },
          ];
          return [
            clock_,
            emitted.concat(
              Array(ticks)
                .fill(undefined) // this weird-looking construct prepares an array that is n ticks in length
                .map((_, index) => ({
                  tag: "simulation-clock-tick",
                  tick: tick + index + 1,
                }))
            ),
          ];
      }
    },
    [clock, []]
  );
}

export function createStar(
  id: string = "star-id",
  mass: number = 1.989e30
): Star {
  return { id, incoming: [], received: [], tag: "star", mass };
}

function starProcess(star: Star): [Star, Event[]] {
  return star.received.reduce<[Star, Event[]]>(
    ([star_, emitted], event) => {
      if (!includes(SUBSCRIPTIONS[star_.tag], event.tag)) {
        return [star_, emitted];
      }
      switch (event.tag) {
        case "simulation-clock-tick":
          return [
            star_,
            emitted.concat([{ tag: "star-flux-emission", flux: 0 }]),
          ];
      }
    },
    [star, []]
  );
}

export function createCollector(id: string = "collector-id"): Collector {
  return {
    id,
    incoming: [],
    received: [],
    tag: "collector",
  };
}
function collectorProcess(c: Collector): [Collector, Event[]] {
  return c.received.reduce<[Collector, Event[]]>(
    ([collector, emitted], event) => {
      if (!includes(SUBSCRIPTIONS[collector.tag], event.tag)) {
        return [collector, emitted];
      }
      switch (event.tag) {
        case "star-flux-emission":
          return [
            collector,
            emitted.concat([{ tag: "collector-energy-production", energy: 1 }]),
          ];
      }
    },
    [c, []]
  );
}

function process(p: EventProcessor): [EventProcessor, Event[]] {
  p.received = Array.from(p.incoming);
  p.incoming = [];
  switch (p.tag) {
    case "stream":
      return [memoryStreamProcess(p), []];
    case "clock":
      return clockProcess(p);
    case "star":
      return starProcess(p);
    case "planet":
      return [p, []];
    case "collector":
      return collectorProcess(p);
  }
  console.error({ command: "process", processor: p });
}

export function processAll(sim: Simulation): Simulation {
  return [...sim.processors.values()].reduce((sim_, p) => {
    const [updatedP, emitted] = process(p);
    sim_.processors.set(updatedP.id, updatedP);
    return pushEvents(emitted, sim_);
  }, sim);
}

const SUBSCRIPTIONS = {
  stream: new Set([
    "outside-clock-tick",
    "simulation-clock-tick",
    "command-simulation-clock-play",
    "simulation-clock-play",
    "star-flux-emission",
    "collector-energy-production",
  ] as const),
  clock: new Set([
    "outside-clock-tick",
    "command-simulation-clock-play",
  ] as const),
  star: new Set(["simulation-clock-tick"] as const),
  planet: new Set([] as const),
  collector: new Set(["star-flux-emission"] as const),
} as const;

type SaveState = { processors: EventProcessor[] };
export function loadSave(
  save: SaveState,
  options: Partial<{
    enforce: Partial<{ clock: boolean; stream: boolean }>;
  }> = {}
): Simulation {
  const flatSubs = save.processors.flatMap((p) =>
    [...SUBSCRIPTIONS[p.tag]].map<[EventTag, Id]>((tag) => [tag, p.id])
  );
  const subsByTag = flatSubs.reduce<Map<EventTag, Set<Id>>>(
    (accu, [tag, id]) => accu.set(tag, (accu.get(tag) ?? new Set()).add(id)),
    new Map()
  );
  const simulation = {
    bus: {
      subscriptions: subsByTag,
    },
    processors: new Map(save.processors.map((p) => [p.id, p])),
  };
  if (
    options?.enforce?.stream &&
    ![...simulation.processors.values()].some((p) => p.tag === "stream")
  ) {
    insertProcessor(simulation, createMemoryStream());
  }
  if (
    options?.enforce?.clock &&
    ![...simulation.processors.values()].some((p) => p.tag === "clock")
  ) {
    insertProcessor(simulation, createClock(window.performance.now()));
  }
  return simulation;
}
export function generateSave(sim: Simulation): SaveState {
  return { processors: [...sim.processors.values()] };
}
export function blankSave(): SaveState {
  return { processors: [] };
}
/* ================================= */
function App() {
  const savedState = blankSave();
  const simulation = loadSave(savedState, {
    enforce: { clock: true, stream: true },
  });

  let renderFrame: number;
  let clockFrame: number;

  function renderLoop() {
    processAll(simulation);
    renderFrame = window.requestAnimationFrame(renderLoop);
  }
  renderFrame = window.requestAnimationFrame(renderLoop);

  function outsideClockLoop(timeStamp: DOMHighResTimeStamp) {
    pushEvents([{ tag: "outside-clock-tick", timeStamp }], simulation);
    clockFrame = window.requestAnimationFrame(outsideClockLoop);
  }
  clockFrame = window.requestAnimationFrame(outsideClockLoop);

  return () =>
    [renderFrame, clockFrame].forEach((frame) =>
      window.cancelAnimationFrame(frame)
    );
}

/* ================================= */

type Satellite = { tag: "satellite"; launched: boolean } & EventProcessor;
type PowerGrid = {
  tag: "power grid";
  stored: number;
  breakerTripped: boolean;
} & EventProcessor;
type Storage<R extends Resource> = {
  tag: "storage";
  stored: number;
  resource: R;
};
type Fabricator = {
  tag: "fabricator";
  working: boolean;
  job: SingleBuildOrder;
  queue: BuildOrder[];
} & EventProcessor;
type Miner = { tag: "miner"; working: boolean } & EventProcessor;
type Refiner = { tag: "refiner"; working: boolean } & EventProcessor;
type Factory = { tag: "factory"; working: boolean } & EventProcessor;
type Launcher = { tag: "launcher"; working: boolean } & EventProcessor;
