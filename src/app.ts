import App from "./App.svelte";
import type {
  Buildings,
  CircuitBreaker,
  Resources,
  Swarm,
  Working,
} from "./gameStateStore";
import { Construct, Resource } from "./gameStateStore";

const resources: Resources = {
  [Resource.ELECTRICITY]: 10 ** 3,
  [Resource.ORE]: 0,
  [Resource.METAL]: 2 * 10 ** 2,
  [Resource.PACKAGED_SATELLITE]: 0,
};
const buildings: Buildings = {
  [Construct.SOLAR_COLLECTOR]: 10,
  [Construct.MINER]: 0,
  [Construct.REFINER]: 0,
  [Construct.SATELLITE_FACTORY]: 0,
  [Construct.SATELLITE_LAUNCHER]: 0,
};
const swarm: Swarm = { satellites: 0 };
const breaker: CircuitBreaker = { tripped: false };
const working: Working = new Map([
  ["swarm", swarm.satellites],
  ...Object.entries(buildings),
]) as Working;

const app = new App({
  target: document.body,
  props: {
    init: {
      resources,
      buildings,
      swarm,
      breaker,
      working,
    },
  },
});

export default app;
