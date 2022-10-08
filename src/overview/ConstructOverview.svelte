<script lang="ts">
  import ConstructOverview from "./Construct.svelte";
  import type { CircuitBreaker } from "../gameStateStore";
  import {
    Construct,
    Resource,
    tickConsumption,
    tickProduction,
  } from "../gameStateStore";
  import { launchCost } from "../actions";
  import Fabricator from "./Fabricator.svelte";
  import { kilogram, watt, wattsPerSquareMeter } from "../units";
  import { energy, ICON, metal, ore, satellite } from "../icons";
  import GridBreaker from "./GridBreaker.svelte";

  export let constructs = new Map();
  export let circuitBreaker: CircuitBreaker = { tripped: false };
</script>

<section
  class="flex flex-row flex-wrap gap-1 p-1 border-2 rounded border-slate-100"
>
  <h3 class="text-slate-100 font-bold text-center basis-full">Constructs</h3>
  <div class="flex-grow flex flex-row justify-items-stretch">
    <div
      class="basis-2/5 flex-grow p-1 flex flex-row gap-1 border-2 rounded border-yellow-500 text-yellow-400"
    >
      <img
        class="max-w-min aspect-square self-center mr-1"
        src={ICON["star"]}
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
                class="self-center max-w-min h-4 aspect-square"
                src={ICON["flux"]}
                alt="Energy Flux"
              />
              <output>6.300e7 {@html wattsPerSquareMeter}</output>
            </span>
          </div>
        </div>
      </div>
    </div>
    <!-- TODO: Swarm Overview appears when count > 0 -->
    <div
      class="basis-3/5 flex-grow p-1 flex flex-row gap-1 border-2 rounded border-zinc-300 text-zinc-300"
    >
      <img
        class="max-h-16 aspect-square self-center mr-1"
        src="/satellite.svg"
        alt="Satellite"
      />
      <div class="basis-full flex flex-row flex-wrap justify-between">
        <div class="flex flex-col justify-between">
          <h4 class="basis-full font-bold">Satellite</h4>
          <div class="flex flex-col">
            <h5 class="font-bold">Count:</h5>
            <output>103</output>
          </div>
        </div>
        <div class="flex flex-col-reverse">
          <div class="text-zinc-300 flex flex-col">
            <h5 class="font-bold">Redirects:</h5>
            <span class="flex flex-row gap-1">
              <img
                class="self-center max-w-min h-4 aspect-square"
                src={ICON["flux"]}
                alt="Energy Flux"
              />
              <output>10 {@html wattsPerSquareMeter}</output>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ConstructOverview
    name="solar collector"
    consumes={[
      {
        name: "energy-flux",
        value: "1-300",
        unit: wattsPerSquareMeter,
        icon: ICON["flux"],
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
  <GridBreaker open={circuitBreaker.tripped} />
  <Fabricator />
  <div class="flex-grow flex flex-row justify-items-stretch">
    <div
      class="basis-2/5 flex-grow p-1 flex flex-row gap-1 border-2 rounded border-orange-300 text-amber-300"
    >
      <img
        class="max-w-min aspect-square self-center mr-1"
        src={ICON["planet"]}
        alt="Planet"
      />
      <div class="basis-full flex flex-row flex-wrap justify-between">
        <div class="flex flex-col justify-between">
          <h4 class="basis-full font-bold">Planet</h4>
          <div class="flex flex-col">
            <h5 class="font-bold">Mass:</h5>
            <output>3.301e23 {kilogram}</output>
          </div>
        </div>
      </div>
    </div>
    <ConstructOverview
      name="miner"
      basis="3/5"
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
  </div>
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
