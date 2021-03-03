import App from "./App.svelte";
import "augmented-ui/augmented-ui.min.css";
import type { Resources, Buildings, Swarm } from "./types";

const resources: Resources = {
  electricity: 10 ** 3,
  ore: 0,
  metal: 2 * 10 ** 3,
  packagedSatellites: 0,
};
const buildings: Buildings = {
  solarCollector: 150,
  miner: 20,
  refiner: 6,
  satelliteFactory: 1,
  satelliteLauncher: false,
};
const swarm: Swarm = { satellites: 0 };
const app = new App({
  target: document.body,
  props: {
    init: {
      resources,
      buildings,
      swarm,
    },
  },
});

export default app;