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
  [Construct.MINER]: new Map([[Resource.ELECTRICITY, 3] as const] as const),
  [Construct.REFINER]: new Map([
    [Resource.ELECTRICITY, 5] as const,
    [Resource.ORE, 5] as const,
  ] as const),
  [Construct.SATELLITE_FACTORY]: new Map([
    [Resource.ELECTRICITY, 25] as const,
    [Resource.METAL, 7] as const,
  ] as const),
  [Construct.SATELLITE_LAUNCHER]: new Map([
    [Resource.ELECTRICITY, 1.4 * 10 ** 3] as const,
    [Resource.PACKAGED_SATELLITE, 1] as const,
  ] as const),
} as const;

export const tickProduction = {
  [Construct.SOLAR_COLLECTOR]: new Map([
    [Resource.ELECTRICITY, 1] as const,
  ] as const),
  [Construct.MINER]: new Map([[Resource.ORE, 1] as const] as const),
  [Construct.REFINER]: new Map([[Resource.METAL, 3] as const] as const),
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

// values copied from
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html
export const SOL_RADIUS_M = BigInt(695_700_000); // meter
export const SOL_MASS_KG = BigInt(1_988_500) * 10n ** 24n; // kilogram
export const SOL_LUMINOSITY_W = BigInt(3_828) * 10n ** 23n; // Watt
export const MERCURY_SEMIMAJOR_AXIS_M = BigInt(57_909) * 10n ** 6n; // meters
export const MERCURY_MASS_KG = BigInt(3_301) * 10n ** 20n; // kilogram
