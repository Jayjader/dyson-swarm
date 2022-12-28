import { Construct, Resource } from "./gameStateStore";

export const flux = "/flux.svg";
export const energy = "/electric.svg";
export const ore = "/ore.svg";
export const metal = "/metal-bar.svg";
export const satellite = "/satellite.svg";

export const star = "/star.png";
export const planet = "/planet.png";

export const collector = "/solar collector.png";
export const fabricator = "/fabricator.png";
export const miner = "/miner.png";
export const refiner = "/refiner.png";
export const factory = "/satellite factory.png";
export const launcher = "/satellite launcher.png";

export const ICON = {
  star: star,
  planet: planet,
  fabricator: fabricator,
  flux: flux,
  [Resource.ELECTRICITY]: energy,
  [Resource.ORE]: ore,
  [Resource.METAL]: metal,
  [Resource.PACKAGED_SATELLITE]: satellite,
  [Construct.SOLAR_COLLECTOR]: collector,
  [Construct.MINER]: miner,
  [Construct.REFINER]: refiner,
  [Construct.SATELLITE_FACTORY]: factory,
  [Construct.SATELLITE_LAUNCHER]: launcher,
} as const;
