import type { Resource } from "../../gameRules";
import type { SUBSCRIPTIONS } from "../subscriptions";
import type { CollectorManager } from "./collector";
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
  lastTick: number;
};
export type EventProcessor<
  Tag extends string,
  Data extends undefined | object = undefined,
> = Tag extends keyof typeof SUBSCRIPTIONS
  ? Data extends undefined
    ? { core: ProcessorCore<Tag> }
    : { data: Data } & { core: ProcessorCore<Tag> }
  : never;

export type Processor =
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
export type Id = Processor["core"]["id"];
export function tagFromId(id: Id) {
  return id.slice(0, id.lastIndexOf("-")) as keyof typeof SUBSCRIPTIONS;
}
