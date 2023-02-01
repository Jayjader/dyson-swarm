export enum Resource {
  ELECTRICITY = "power",
  ORE = "ore",
  METAL = "metal",
  PACKAGED_SATELLITE = "satellite",
}

export enum Construct {
  SOLAR_COLLECTOR = "collector",
  MINER = "miner",
  REFINER = "refiner",
  SATELLITE_FACTORY = "factory",
  SATELLITE_LAUNCHER = "launcher",
}

export const tickConsumption = {
  [Construct.SATELLITE_LAUNCHER]: new Map([
    [Resource.ELECTRICITY, 1.4 * 10 ** 3] as const,
    [Resource.PACKAGED_SATELLITE, 1] as const,
  ] as const),
  [Construct.MINER]: new Map([[Resource.ELECTRICITY, 3] as const] as const),
  [Construct.REFINER]: new Map([
    [Resource.ELECTRICITY, 5] as const,
    [Resource.ORE, 3] as const,
  ] as const),
  [Construct.SATELLITE_FACTORY]: new Map([
    [Resource.ELECTRICITY, 25] as const,
    [Resource.METAL, 2] as const,
  ] as const),
} as const;

export const tickProduction = {
  [Construct.SOLAR_COLLECTOR]: new Map([
    [Resource.ELECTRICITY, 1] as const,
  ] as const),
  [Construct.MINER]: new Map([[Resource.ORE, 1] as const] as const),
  [Construct.REFINER]: new Map([[Resource.METAL, 1] as const] as const),
  [Construct.SATELLITE_FACTORY]: new Map([
    [Resource.PACKAGED_SATELLITE, 1] as const,
  ] as const),
  satellite: new Map([["flux", 1] as const] as const),
} as const;

export type Input = Map<Resource, number>;
export const constructionCosts: Record<Construct, Input> = {
  [Construct.SOLAR_COLLECTOR]: new Map([
    [Resource.ELECTRICITY, 100],
    [Resource.METAL, 10],
  ]),
  [Construct.MINER]: new Map([
    [Resource.ELECTRICITY, 150],
    [Resource.METAL, 30],
  ]),
  [Construct.REFINER]: new Map([
    [Resource.ELECTRICITY, 500],
    [Resource.METAL, 45],
  ]),
  [Construct.SATELLITE_LAUNCHER]: new Map([
    [Resource.ELECTRICITY, 2 * 10 ** 3],
    [Resource.METAL, 170],
  ]),
  [Construct.SATELLITE_FACTORY]: new Map([
    [Resource.ELECTRICITY, 10 ** 4],
    [Resource.METAL, 13 * 10 ** 2],
  ]),
};
export const launchCost = new Map([
  [Resource.ELECTRICITY, 1.4 * 10 ** 3],
  [Resource.PACKAGED_SATELLITE, 1],
] as const);
