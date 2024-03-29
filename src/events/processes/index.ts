import type { Resource } from "../../gameRules";
import type { Events } from "../events";
import type { SUBSCRIPTIONS, SubscriptionsFor } from "../subscriptions";
import type { Clock } from "./clock";
import type { CollectorManager } from "./collector";
import type { EventStream } from "./eventStream";
import type { Fabricator } from "./fabricator";
import type { LauncherManager } from "./launcher";
import type { MinerManager } from "./miner";
import type { Planet } from "./planet";
import type { PowerGrid } from "./powerGrid";
import type { RefinerManager } from "./refiner";
import type { SatelliteSwarm } from "./satelliteSwarm";
import type { SatelliteFactoryManager } from "./satFactory";
import type { Star } from "./star";
import type { Storage } from "./storage";
import type { ObjectiveTrackerProbe } from "./objectiveTracker";

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

export type Processor =
  | EventStream
  | Clock
  | Star
  | Planet
  | CollectorManager
  | PowerGrid
  | MinerManager
  | Storage<Exclude<Resource, Resource.ELECTRICITY>>
  | RefinerManager
  | SatelliteFactoryManager
  | LauncherManager
  | SatelliteSwarm
  | Fabricator
  | ObjectiveTrackerProbe;
export type Id = Processor["id"];
