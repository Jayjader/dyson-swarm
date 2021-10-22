import App from "./App.svelte";
import {
  Building,
  Buildings,
  CircuitBreaker,
  Resource,
  Resources,
  Swarm,
  Working,
} from "./types";

const resources: Resources = {
  [Resource.ELECTRICITY]: 10 ** 3,
  [Resource.ORE]: 0,
  [Resource.METAL]: 2 * 10 ** 2,
  [Resource.PACKAGED_SATELLITE]: 0,
};
const buildings: Buildings = {
  [Building.SOLAR_COLLECTOR]: 10,
  [Building.MINER]: 0,
  [Building.REFINERY]: 0,
  [Building.SATELLITE_FACTORY]: 0,
  [Building.SATELLITE_LAUNCHER]: 0,
};
const swarm: Swarm = { satellites: 0 };
const breaker: CircuitBreaker = { tripped: false };
const working: Working = {
  [Building.MINER]: true,
  [Building.REFINERY]: true,
  [Building.SOLAR_COLLECTOR]: true,
  [Building.SATELLITE_FACTORY]: true,
  swarm: true,
};

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
