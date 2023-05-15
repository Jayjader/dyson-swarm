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
  [Construct.MINER]: new Map([[Resource.ELECTRICITY, 3n] as const] as const),
  [Construct.REFINER]: new Map([
    [Resource.ELECTRICITY, 5n] as const,
    [Resource.ORE, 5n] as const,
  ] as const),
  [Construct.SATELLITE_FACTORY]: new Map([
    [Resource.ELECTRICITY, 25n] as const,
    [Resource.METAL, 7n] as const,
  ] as const),
  [Construct.SATELLITE_LAUNCHER]: new Map([
    [Resource.ELECTRICITY, 1_400n] as const,
    [Resource.PACKAGED_SATELLITE, 1n] as const,
  ] as const),
} as const;

export const tickProduction = {
  [Construct.SOLAR_COLLECTOR]: new Map([
    [Resource.ELECTRICITY, 1n] as const,
  ] as const),
  [Construct.MINER]: new Map([[Resource.ORE, 1n] as const] as const),
  [Construct.REFINER]: new Map([[Resource.METAL, 3n] as const] as const),
  [Construct.SATELLITE_FACTORY]: new Map([
    [Resource.PACKAGED_SATELLITE, 1n] as const,
  ] as const),
  satellite: new Map([["flux", 1n] as const] as const),
} as const;

export type Input = Map<Resource, bigint>;
export const constructionCosts: Record<Construct, Input> = {
  [Construct.SOLAR_COLLECTOR]: new Map([
    [Resource.ELECTRICITY, 100n],
    [Resource.METAL, 10n],
  ]),
  [Construct.MINER]: new Map([
    [Resource.ELECTRICITY, 150n],
    [Resource.METAL, 30n],
  ]),
  [Construct.REFINER]: new Map([
    [Resource.ELECTRICITY, 500n],
    [Resource.METAL, 45n],
  ]),
  [Construct.SATELLITE_LAUNCHER]: new Map([
    [Resource.ELECTRICITY, 2_000n],
    [Resource.METAL, 170n],
  ]),
  [Construct.SATELLITE_FACTORY]: new Map([
    [Resource.ELECTRICITY, 10_000n],
    [Resource.METAL, 1_300n],
  ]),
};

// values copied from
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html
export const SOL_RADIUS_M = BigInt(695_700_000); // meter
export const SOL_MASS_KG = BigInt(1_988_500) * 10n ** 24n; // kilogram
export const SOL_LUMINOSITY_W = BigInt(3_828) * 10n ** 23n; // Watt
export const MERCURY_SEMIMAJOR_AXIS_M = BigInt(57_909) * 10n ** 6n; // meters
export const MERCURY_MASS_KG = BigInt(3_301) * 10n ** 20n; // kilogram
