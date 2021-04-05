import App from "./App.svelte";
import type { Resources, Buildings, Swarm, CircuitBreaker } from "./types";

const resources: Resources = {
  electricity: 10 ** 3,
  ore: 0,
  metal: 2 * 10 ** 2,
  packagedSatellites: 0,
};
const buildings: Buildings = {
  solarCollector: 10,
  miner: 0,
  refiner: 0,
  satelliteFactory: 0,
  satelliteLauncher: 0,
};
const swarm: Swarm = { satellites: 0 };
const breaker: CircuitBreaker = { tripped: false };

const app = new App({
  target: document.body,
  props: {
    init: {
      resources,
      buildings,
      swarm,
      breaker,
    },
  },
});

export default app;
