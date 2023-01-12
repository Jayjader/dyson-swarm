<script lang="ts">
  import Storage from "./Storage.svelte";
  import { Resource } from "../../gameRules";
  import { getClock } from "../../events/processes/clock";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../../events";
  import { getPrimitive } from "../../hud/types";
  import type { Events } from "../../events/events";
  import { getEventStream } from "../../events/processes/eventStream";

  const watt = "W";
  const wattTick = `${watt}t`;
  const kilogram = "kg";

  export let resources = new Map();

  const simulation = getContext(SIMULATION_STORE).simulation;

  let last = {
    tick: 0,
    resources: new Map([
      [Resource.ELECTRICITY, { produce: 0, supply: 0 }],
      [Resource.ORE, { produce: 0, supply: 0 }],
      [Resource.METAL, { produce: 0, supply: 0 }],
      [Resource.PACKAGED_SATELLITE, { produce: 0, supply: 0 }],
    ] as const),
  };
  const unsubSim = simulation.subscribe((sim) => {
    const stream = getEventStream(sim);
    const currentTick = getPrimitive(getClock(sim)).tick;
    if (currentTick > last.tick) {
      const start = stream.findIndex(
        (e) => e?.receivedTick === currentTick - 1
      );
      last.resources = stream.slice(start).reduce(
        (accu, e) => {
          if (!["produce", "supply"].includes(e.tag)) {
            return accu;
          }
          if (
            (e as Events<"produce" | "supply">).receivedTick !== currentTick
          ) {
            return accu;
          }
          const previous = accu.get(e.resource as Resource);
          previous[e.tag] += e.amount;
          return accu;
        },
        new Map([
          [Resource.ELECTRICITY, { produce: 0, supply: 0 }],
          [Resource.ORE, { produce: 0, supply: 0 }],
          [Resource.METAL, { produce: 0, supply: 0 }],
          [Resource.PACKAGED_SATELLITE, { produce: 0, supply: 0 }],
        ])
      );
      last.tick = currentTick;
      last = last;
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
    produced={last.resources.get(Resource.ELECTRICITY).produce}
    consumed={last.resources.get(Resource.ELECTRICITY).supply}
  />
  <Storage
    name="Ore"
    icon="/ore.svg"
    unit={kilogram}
    stored={resources.get(Resource.ORE)}
    produced={last.resources.get(Resource.ORE).produce}
    consumed={last.resources.get(Resource.ORE).supply}
  />
  <Storage
    name="Metal"
    icon="/metal-bar.svg"
    unit={kilogram}
    stored={resources.get(Resource.METAL)}
    produced={last.resources.get(Resource.METAL).produce}
    consumed={last.resources.get(Resource.METAL).supply}
  />
  <Storage
    name="Satellites"
    icon="/cardboard-box.svg"
    stored={resources.get(Resource.PACKAGED_SATELLITE)}
    produced={last.resources.get(Resource.PACKAGED_SATELLITE).produce}
    consumed={last.resources.get(Resource.PACKAGED_SATELLITE).supply}
  />
</section>
