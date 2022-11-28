import type { SubscriptionsFor } from "../index";
import {
  blankSave,
  broadcastEvent,
  loadSave,
  processUntilSettled,
  SUBSCRIPTIONS,
} from "../index";
import type { Events } from "../events";
import type { BuildOrder, SingleBuildOrder } from "../../types";
import type { Resource } from "../../gameStateStore";
import type { Storage } from "./storage";
import type { Clock } from "./clock";
import type { PowerGrid } from "./powerGrid";
import type { Miner } from "./miner";
import type { Planet } from "./planet";
import type { Refiner } from "./refiner";
import type { Star } from "./star";
import type { Collector } from "./collector";
import type { SatFactory } from "./satFactory";

type ProcessorCore<Tag extends keyof typeof SUBSCRIPTIONS> = {
  tag: Tag;
  id: `${Tag}-${number}`;
  incoming: Events<SubscriptionsFor<Tag>>[];
};
export type EventProcessor<
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

export type Processor =
  | EventStream
  | Clock
  | Star
  | Planet
  | Collector
  | PowerGrid
  | Miner
  | Storage<Exclude<Resource, Resource.ELECTRICITY>>
  | Refiner
  | SatFactory;
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
type Launcher = { tag: "launcher"; working: boolean } & Processor;
