<script lang="ts">
  import ConstructOverview from "./ConstructOverview.svelte";
  import type { CircuitBreaker } from "../gameStateStore";
  import {
    Construct,
    Resource,
    tickConsumption,
    tickProduction,
  } from "../gameStateStore";
  import { launchCost } from "../actions";

  const wattsPerSquareMeter = "W/m<sup>2</sup>";
  const kilogram = "kg";
  const watt = "W";

  const energy = "/electric.svg";
  const ore = "/ore.svg";
  const metal = "/metal-bar.svg";
  const satellite = "/satellite.svg";

  export let constructs = new Map();
  export let circuitBreaker: CircuitBreaker = { tripped: false };
</script>

<section
  class="flex flex-row flex-wrap gap-1 p-1 border-2 rounded border-slate-100"
>
  <h3 class="text-slate-100 font-bold text-center basis-full">Constructs</h3>
  <div
    class="basis-full p-1 flex flex-row gap-1 border-2 rounded border-yellow-500 text-yellow-400"
  >
    <img
      class="max-w-min aspect-square self-center mr-1"
      src="/star.png"
      alt="Star"
    />
    <div class="basis-full flex flex-row flex-wrap justify-between">
      <div class="flex flex-col justify-between">
        <h4 class="basis-full font-bold">Star</h4>
        <div class="flex flex-col">
          <h5 class="font-bold">Mass:</h5>
          <output>1.989e30 {kilogram}</output>
        </div>
      </div>
      <div class="flex flex-col-reverse">
        <div class="text-zinc-300 flex flex-col">
          <h5 class="font-bold">Produces:</h5>
          <span class="flex flex-row gap-1">
            <img
              class="self-center max-w-min aspect-square"
              src="https://via.placeholder.com/24.png"
              alt="Energy Flux"
            />
            <output>6.300e7 {@html wattsPerSquareMeter}</output>
          </span>
        </div>
      </div>
    </div>
  </div>
  <!-- TODO: Swarm Overview when count > 0 -->
  <ConstructOverview
    name="solar collector"
    consumes={[
      {
        name: "energy-flux",
        value: "1-300",
        unit: wattsPerSquareMeter,
        icon: "https://via.placeholder.com/28.png",
      },
    ]}
    produces={{
      name: "energy",
      value: "0.75",
      unit: `${watt} [/${wattsPerSquareMeter} consumed]`,
      icon: energy,
    }}
  >
    <div class="flex flex-row">
      <h5 class="font-bold">Count:</h5>
      <output>{constructs.get(Construct.SOLAR_COLLECTOR) ?? 0}</output>
    </div>
  </ConstructOverview>
  <label>
    Circuit Breaker
    <input
      type="checkbox"
      class={"justify-self-center border-2 rounded-xl p-2 mx-auto " +
        (circuitBreaker.tripped
          ? "border-red-400 text-red-400"
          : "border-zinc-300 text-zinc-300")}
      value={circuitBreaker.tripped}
    />
  </label>
  <!-- TODO: Fabricator Overview -->
  <ConstructOverview
    name="miner"
    consumes={[
      {
        name: "energy",
        value: tickConsumption[Construct.MINER].get(Resource.ELECTRICITY),
        unit: watt,
        icon: energy,
      },
    ]}
    produces={{
      name: "metal ore",
      value: tickProduction[Construct.MINER].get(Resource.ORE),
      unit: kilogram,
      icon: ore,
    }}
  >
    <div class="flex flex-col">
      <h5 class="font-bold">Working:</h5>
      <span class="flex flex-row gap-1">
        <button class="border-2 rounded border-zinc-50">None</button>
        <input
          type="number"
          max={constructs.get(Construct.MINER) ?? 0}
          min={0}
          style="max-width: 6ch"
        />
        <output>/{constructs.get(Construct.MINER) ?? 0}</output>
        <button class="border-2 rounded border-zinc-50">All</button>
      </span>
    </div>
  </ConstructOverview>
  <ConstructOverview
    name="refiner"
    consumes={[
      {
        name: "energy",
        value: tickConsumption[Construct.REFINERY].get(Resource.ELECTRICITY),
        unit: watt,
        icon: energy,
      },
      {
        name: "ore",
        value: tickConsumption[Construct.REFINERY].get(Resource.ORE),
        unit: kilogram,
        icon: ore,
      },
    ]}
    produces={{
      name: "refined metal",
      value: tickProduction[Construct.REFINERY].get(Resource.METAL),
      unit: kilogram,
      icon: metal,
    }}
  >
    <div class="flex flex-col">
      <h5 class="font-bold">Working:</h5>
      <span class="flex flex-row gap-1">
        <button class="border-2 rounded border-zinc-50">None</button>
        <input
          type="number"
          min={0}
          max={constructs.get(Construct.REFINERY)}
          style="max-width: 6ch"
        />
        <output>/{constructs.get(Construct.REFINERY) ?? 0}</output>
        <button class="border-2 rounded border-zinc-50">All</button>
      </span>
    </div>
  </ConstructOverview>
  <ConstructOverview
    name="satellite factory"
    consumes={[
      {
        name: "energy",
        value: tickConsumption[Construct.SATELLITE_FACTORY].get(
          Resource.ELECTRICITY
        ),
        unit: watt,
        icon: energy,
      },
      {
        name: "refined metal",
        value: tickConsumption[Construct.SATELLITE_FACTORY].get(Resource.METAL),
        unit: kilogram,
        icon: metal,
      },
    ]}
    produces={{
      name: "packaged satellite",
      value: tickProduction[Construct.SATELLITE_FACTORY].get(
        Resource.PACKAGED_SATELLITE
      ),
      unit: "(packaged)",
      icon: satellite,
    }}
  >
    <div class="flex flex-col">
      <h5 class="font-bold">Working:</h5>
      <span class="flex flex-row gap-1">
        <button class="border-2 rounded border-zinc-50">None</button>
        <input
          type="number"
          min={0}
          max={constructs.get(Construct.SATELLITE_FACTORY)}
          style="max-width: 6ch"
        />
        <output>/{constructs.get(Construct.SATELLITE_FACTORY) ?? 0}</output>
        <button class="border-2 rounded border-zinc-50">All</button>
      </span>
    </div>
  </ConstructOverview>
  <ConstructOverview
    name="satellite launcher"
    consumes={[
      {
        name: "energy",
        value: launchCost.get(Resource.ELECTRICITY),
        unit: watt,
        icon: energy,
      },
      {
        name: "packaged satellite",
        value: launchCost.get(Resource.PACKAGED_SATELLITE),
        unit: "(packaged)",
        icon: satellite,
      },
    ]}
    produces={{
      name: "deployed satellite",
      value: 1,
      unit: "(deployed)",
      icon: satellite,
    }}
  >
    <div class="flex flex-col">
      <h5 class="font-bold">Working:</h5>
      <span class="flex flex-row gap-1">
        <button class="border-2 rounded border-zinc-50">None</button>
        <input
          type="number"
          min={0}
          max={constructs.get(Construct.SATELLITE_LAUNCHER)}
          style="max-width: 6ch"
        />
        <output>/{constructs.get(Construct.SATELLITE_LAUNCHER) ?? 0}</output>
        <button class="border-2 rounded border-zinc-50">All</button>
      </span>
    </div>
  </ConstructOverview>
</section>
