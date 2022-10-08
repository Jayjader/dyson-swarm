import { Resource } from "./gameStateStore";

export const wattsPerSquareMeter = "W/m<sup>2</sup>";
export const kilogram = "kg";
export const watt = "W";

export const UNIT = {
  [Resource.ELECTRICITY]: watt,
  [Resource.ORE]: kilogram,
  [Resource.METAL]: kilogram,
  [Resource.PACKAGED_SATELLITE]: "",
} as const;
