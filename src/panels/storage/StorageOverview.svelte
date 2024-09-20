<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE, type SimulationStore } from "../../events";
  import { getClock } from "../../events/processes/clock";
  import { Resource } from "../../gameRules";
  import { getPrimitive } from "../../hud/types";
  import Storage from "./Storage.svelte";

  const watt = "W";
  const wattTick = `${watt}t`;
  const kilogram = "kg";

  export let resources = new Map();

  const simulation = getContext(SIMULATION_STORE).simulation as SimulationStore;

  let last = {
    tick: 0,
    resources: new Map([
      [Resource.ELECTRICITY, { produce: 0n, supply: 0n }],
      [Resource.ORE, { produce: 0n, supply: 0n }],
      [Resource.METAL, { produce: 0n, supply: 0n }],
      [Resource.PACKAGED_SATELLITE, { produce: 0n, supply: 0n }],
    ]),
  };
  const unsubSim = simulation.subscribe(async (_sim) => {
    const currentTick = getPrimitive(await getClock(simulation.adapters)).tick; // todo: don't forget this part in the upcoming refactor of clock vs simulation
    if (currentTick > last.tick) {
      const events =
        await simulation.adapters.events.read.getTickEvents(currentTick);
      if (events) {
        const receivedResources = events.reduce(
          (accu, e) => {
            if (e.tag !== "produce" && e.tag !== "supply") {
              return accu;
            }
            const previous = accu.get(e.resource)!;
            previous[e.tag] += e.amount;
            return accu;
          },
          new Map([
            [Resource.ELECTRICITY, { produce: 0n, supply: 0n }],
            [Resource.ORE, { produce: 0n, supply: 0n }],
            [Resource.METAL, { produce: 0n, supply: 0n }],
            [Resource.PACKAGED_SATELLITE, { produce: 0n, supply: 0n }],
          ]),
        );
        last.tick = currentTick;
        last.resources = receivedResources;
        last = last; // trigger svelte reactivity
      }
    }
  });
  onDestroy(unsubSim);
</script>

<section class="flex flex-col gap-1 rounded border-2 border-slate-100 p-1">
  <h2 class="text-center font-bold text-slate-100">Storage</h2>
  <Storage
    name="Power"
    icon="/electric.svg"
    unit={wattTick}
    stored={resources.get(Resource.ELECTRICITY)}
    produced={last.resources.get(Resource.ELECTRICITY)?.produce}
    consumed={last.resources.get(Resource.ELECTRICITY)?.supply}
  />
  <Storage
    name="Ore"
    icon="/ore.svg"
    unit={kilogram}
    stored={resources.get(Resource.ORE)}
    produced={last.resources.get(Resource.ORE)?.produce}
    consumed={last.resources.get(Resource.ORE)?.supply}
  />
  <Storage
    name="Metal"
    icon="/metal-bar.svg"
    unit={kilogram}
    stored={resources.get(Resource.METAL)}
    produced={last.resources.get(Resource.METAL)?.produce}
    consumed={last.resources.get(Resource.METAL)?.supply}
  />
  <Storage
    name="Satellites"
    icon="/cardboard-box.svg"
    stored={resources.get(Resource.PACKAGED_SATELLITE)}
    produced={last.resources.get(Resource.PACKAGED_SATELLITE)?.produce}
    consumed={last.resources.get(Resource.PACKAGED_SATELLITE)?.supply}
  />
</section>
