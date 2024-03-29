<script lang="ts">
  import ConstructOverview from "./Construct.svelte";
  import {
    Construct,
    MERCURY_SEMIMAJOR_AXIS_M,
    Resource,
    SOL_LUMINOSITY_W,
    tickConsumption,
    tickProduction,
  } from "../../gameRules";
  import { SIMULATION_STORE } from "../../events";
  import Fabricator from "./Fabricator.svelte";
  import { kilogram, watt, wattsPerSquareMeter } from "../../units";
  import { energy, ICON, metal, ore, satellite } from "../../icons";
  import GridBreaker from "./GridBreaker.svelte";
  import {
    fluxReceived,
    getCollectorCount,
    SOLAR_COLLECTOR_PRODUCTION_EFFICIENCY,
  } from "../../events/processes/collector";
  import { getMiners } from "../../events/processes/miner";
  import { getRefiners } from "../../events/processes/refiner";
  import { getFactories } from "../../events/processes/satFactory";
  import { getLaunchers } from "../../events/processes/launcher";
  import { getStarMass } from "../../events/processes/star";
  import { getPlanetMass } from "../../events/processes/planet";
  import {
    fluxReflected,
    swarmCount,
  } from "../../events/processes/satelliteSwarm";
  import { getFabricator } from "../../events/processes/fabricator";
  import { getContext, onDestroy } from "svelte";
  import { getPrimitive } from "../../hud/types";
  import { getClock } from "../../events/processes/clock";
  import WorkingCountToggle from "./WorkingCountToggle.svelte";

  const simulation = getContext(SIMULATION_STORE).simulation;

  let constructs = new Map();
  let fabricator = { working: false, job: null as Construct | null };
  let lastTick = 0;

  const unsubscribe = simulation.subscribe((sim) => {
    lastTick = getPrimitive(getClock(sim)).tick;
    constructs.set(Construct.SOLAR_COLLECTOR, getCollectorCount(sim));
    constructs.set(Construct.MINER, getMiners(sim));
    constructs.set(Construct.REFINER, getRefiners(sim));
    constructs.set(Construct.SATELLITE_FACTORY, getFactories(sim));
    constructs.set(Construct.SATELLITE_LAUNCHER, getLaunchers(sim));
    constructs.set("star", getStarMass(sim));
    constructs.set("planet", getPlanetMass(sim));
    constructs.set("swarm", swarmCount(sim));
    constructs = constructs;
    const fab = getFabricator(sim);
    fabricator.working = fab.working;
    fabricator.job = fab.job;
  });

  const count = (map, tag) => map.get(tag)?.count ?? 0;
  const working = (map, tag) => map.get(tag)?.working ?? 0;

  const setCount = (construct, count) => {
    const busEvent = {
      tag: "command-set-working-count",
      count,
      construct,
      afterTick: lastTick,
      timeStamp: performance.now(),
    } as const;
    console.info(busEvent);
    simulation.broadcastEvent(busEvent);
  };
  onDestroy(unsubscribe);

  function widthForNumberInput(value: number): number {
    // log base 10 gets us the number of characters, floor rounds down a whole number
    return (
      Math.floor(
        Math.log(value) / Math.log(10) // log(x) / log(10) = log[base=10](x)
      ) + 4 // room for the browser/user agent's input[type="number"] controls
    );
  }

  const formatter = Intl.NumberFormat([], { useGrouping: true });
</script>

<section
  class="flex flex-row flex-wrap gap-1 rounded border-2 border-slate-100 p-1"
>
  <h2 class="basis-full text-center font-bold text-slate-100">Constructs</h2>
  <div class="flex flex-grow flex-row justify-items-stretch gap-1">
    <div
      class="flex flex-grow basis-2/5 flex-row gap-1 rounded border-2 border-yellow-500 bg-zinc-600 p-1 text-yellow-400"
    >
      <img
        class="mr-1 aspect-square max-w-min self-center"
        src={ICON["star"]}
        alt="Star"
        title="star"
      />
      <div class="flex basis-full flex-row flex-wrap justify-between">
        <div class="flex flex-col justify-between">
          <h3 class="basis-full font-bold">Star</h3>
          <div class="flex flex-col">
            <h5 class="font-bold">Mass:</h5>
            <output style="overflow-wrap: anywhere"
              >{formatter.format(constructs.get("star"))} {kilogram}</output
            >
          </div>
        </div>
        <div class="flex flex-col-reverse">
          <div class="flex flex-col text-zinc-200">
            <h5 class="font-bold">Produces:</h5>
            <span class="flex flex-row gap-1">
              <img
                class="aspect-square h-4 max-w-min self-center"
                src={ICON["flux"]}
                alt="Energy Flux"
                title="energy flux"
              />
              <output class="break-all"
                >{formatter.format(SOL_LUMINOSITY_W)}
                {@html watt}</output
              >
            </span>
          </div>
        </div>
      </div>
    </div>
    <div
      class="flex flex-grow basis-3/5 flex-row gap-1 rounded border-2 border-zinc-300 bg-slate-500 p-1 text-zinc-50"
    >
      <img
        class="mr-1 aspect-square max-h-16 self-center"
        src="/satellite.svg"
        alt="Satellite Swarm"
        title="satellite swarm"
      />
      <div class="flex basis-full flex-row flex-wrap justify-between">
        <div class="flex flex-col justify-between">
          <h3 class="basis-full font-bold">Satellite Swarm</h3>
          <fieldset class="flex flex-col">
            <legend class="font-bold">Count:</legend>
            <output style="overflow-wrap: anywhere"
              >{formatter.format(constructs.get("swarm"))}</output
            >
          </fieldset>
        </div>
        <div class="flex flex-col-reverse">
          <div class="flex flex-col">
            <h5 class="font-bold">Redirects:</h5>
            <span class="flex flex-row gap-1">
              <img
                class="aspect-square h-4 max-w-min self-center"
                src={ICON["flux"]}
                alt="Energy Flux"
                title="energy flux"
              />
              <output
                >{formatter.format(
                  fluxReflected(SOL_LUMINOSITY_W, MERCURY_SEMIMAJOR_AXIS_M, 1)
                )}
                {@html wattsPerSquareMeter}</output
              >
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ConstructOverview
    name="solar collector"
    consumesVerb="receives"
    consumes={[
      {
        name: "energy-flux",
        value: `${formatter.format(
          fluxReceived(SOL_LUMINOSITY_W, MERCURY_SEMIMAJOR_AXIS_M, 1)
        )}`,
        unit: `${wattsPerSquareMeter}${
          constructs.get("swarm") === 0
            ? ""
            : ` (+ ${formatter.format(
                BigInt(constructs.get("swarm")) *
                  fluxReflected(SOL_LUMINOSITY_W, MERCURY_SEMIMAJOR_AXIS_M, 1)
              )} ${watt} reflected from satellites)`
        }`,
        icon: ICON["flux"],
      },
    ]}
    produces={{
      name: "energy",
      value: `[RECEIVED] * [COUNT] * (${SOLAR_COLLECTOR_PRODUCTION_EFFICIENCY.numerator}/${SOLAR_COLLECTOR_PRODUCTION_EFFICIENCY.denominator})`,
      unit: `${watt}`,
      icon: energy,
    }}
  >
    <fieldset class="flex flex-row">
      <legend class="font-bold">Count:</legend>
      <output
        >{formatter.format(constructs.get(Construct.SOLAR_COLLECTOR))}</output
      >
    </fieldset>
  </ConstructOverview>
  <GridBreaker />
  <Fabricator />
  <div class="flex flex-grow flex-row justify-items-stretch gap-1">
    <div
      class="flex flex-grow basis-2/5 flex-row gap-1 rounded border-2 border-orange-300 bg-zinc-600 p-1 text-amber-300"
    >
      <img
        class="mr-1 aspect-square max-w-min self-center"
        src={ICON["planet"]}
        alt="Planet"
      />
      <div class="flex basis-full flex-row flex-wrap justify-between">
        <div class="flex flex-col justify-between">
          <h3 class="basis-full font-bold">Planet</h3>
          <fieldset class="flex flex-col">
            <legend class="font-bold">Mass:</legend>
            <output style="overflow-wrap: anywhere"
              >{formatter.format(constructs.get("planet"))} {kilogram}</output
            >
          </fieldset>
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
      <fieldset class="flex flex-col">
        <legend class="font-bold">Working:</legend>
        <span
          class="flex max-w-min flex-shrink flex-grow-0 flex-row flex-wrap justify-end gap-1"
        >
          <WorkingCountToggle
            disabled={working(constructs, Construct.MINER) === 0}
            on:click={() => setCount(Construct.MINER, 0)}
            >None</WorkingCountToggle
          >
          <span class="flex-no-wrap flex flex-row">
            <input
              name="amount"
              type="number"
              max={count(constructs, Construct.MINER)}
              min={0}
              value={working(constructs, Construct.MINER)}
              on:change={(e) =>
                setCount(Construct.MINER, parseInt(e.target.value, 10))}
              style="max-width: {widthForNumberInput(
                working(constructs, Construct.MINER)
              )}ch"
            />
            /
            <output name="total"
              >{formatter.format(count(constructs, Construct.MINER))}</output
            >
          </span>
          <WorkingCountToggle
            disabled={working(constructs, Construct.MINER) ===
              count(constructs, Construct.MINER)}
            on:click={() =>
              setCount(Construct.MINER, count(constructs, Construct.MINER))}
            >All</WorkingCountToggle
          >
        </span>
      </fieldset>
    </ConstructOverview>
  </div>
  <ConstructOverview
    name="refiner"
    consumes={[
      {
        name: "energy",
        value: tickConsumption[Construct.REFINER].get(Resource.ELECTRICITY),
        unit: watt,
        icon: energy,
      },
      {
        name: "ore",
        value: tickConsumption[Construct.REFINER].get(Resource.ORE),
        unit: kilogram,
        icon: ore,
      },
    ]}
    produces={{
      name: "refined metal",
      value: tickProduction[Construct.REFINER].get(Resource.METAL),
      unit: kilogram,
      icon: metal,
    }}
  >
    <fieldset class="flex flex-col">
      <legend class="font-bold">Working:</legend>
      <span class="flex flex-row gap-1">
        <WorkingCountToggle
          disabled={working(constructs, Construct.REFINER) === 0}
          on:click={() => setCount(Construct.REFINER, 0)}
          >None</WorkingCountToggle
        >
        <input
          type="number"
          min={0}
          max={count(constructs, Construct.REFINER)}
          value={working(constructs, Construct.REFINER)}
          on:change={(e) =>
            setCount(Construct.REFINER, parseInt(e.target.value, 10))}
          style="max-width: {widthForNumberInput(
            working(constructs, Construct.REFINER)
          )}ch"
        />
        /
        <output>{formatter.format(count(constructs, Construct.REFINER))}</output
        >
        <WorkingCountToggle
          disabled={working(constructs, Construct.REFINER) ===
            count(constructs, Construct.REFINER)}
          on:click={() =>
            setCount(Construct.REFINER, count(constructs, Construct.REFINER))}
          >All</WorkingCountToggle
        >
      </span>
    </fieldset>
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
    <fieldset class="flex flex-col">
      <legend class="font-bold">Working:</legend>
      <span class="flex flex-row gap-1">
        <WorkingCountToggle
          disabled={working(constructs, Construct.SATELLITE_FACTORY) === 0}
          on:click={() => setCount(Construct.SATELLITE_FACTORY, 0)}
          >None</WorkingCountToggle
        >
        <input
          type="number"
          min={0}
          max={count(constructs, Construct.SATELLITE_FACTORY)}
          value={working(constructs, Construct.SATELLITE_FACTORY)}
          on:change={(e) =>
            setCount(Construct.SATELLITE_FACTORY, parseInt(e.target.value, 10))}
          style="max-width: {widthForNumberInput(
            working(constructs, Construct.SATELLITE_FACTORY)
          )}ch"
        />
        /
        <output
          >{formatter.format(
            count(constructs, Construct.SATELLITE_FACTORY)
          )}</output
        >
        <WorkingCountToggle
          disabled={working(constructs, Construct.SATELLITE_FACTORY) ===
            count(constructs, Construct.SATELLITE_FACTORY)}
          on:click={() =>
            setCount(
              Construct.SATELLITE_FACTORY,
              count(constructs, Construct.SATELLITE_FACTORY)
            )}>All</WorkingCountToggle
        >
      </span>
    </fieldset>
  </ConstructOverview>
  <ConstructOverview
    name="satellite launcher"
    consumes={[
      {
        name: "energy",
        value:
          tickConsumption[Construct.SATELLITE_LAUNCHER].get(
            Resource.ELECTRICITY
          ) ?? 0,
        unit: watt,
        icon: energy,
      },
      {
        name: "packaged satellite",
        value:
          tickConsumption[Construct.SATELLITE_LAUNCHER].get(
            Resource.PACKAGED_SATELLITE
          ) ?? 0,
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
    <fieldset class="flex flex-col">
      <legend class="font-bold">Working:</legend>
      <span class="flex flex-row gap-1">
        <WorkingCountToggle
          disabled={working(constructs, Construct.SATELLITE_LAUNCHER) === 0}
          on:click={() => setCount(Construct.SATELLITE_LAUNCHER, 0)}
          >None</WorkingCountToggle
        >
        <input
          type="number"
          min={0}
          max={count(constructs, Construct.SATELLITE_LAUNCHER)}
          value={working(constructs, Construct.SATELLITE_LAUNCHER)}
          on:change={(e) =>
            setCount(
              Construct.SATELLITE_LAUNCHER,
              parseInt(e.target.value, 10)
            )}
          style="max-width: {widthForNumberInput(
            working(constructs, Construct.SATELLITE_LAUNCHER)
          )}ch"
        />
        /
        <output
          >{formatter.format(
            count(constructs, Construct.SATELLITE_LAUNCHER)
          )}</output
        >
        <WorkingCountToggle
          disabled={working(constructs, Construct.SATELLITE_LAUNCHER) ===
            count(constructs, Construct.SATELLITE_LAUNCHER)}
          on:click={() =>
            setCount(
              Construct.SATELLITE_LAUNCHER,
              count(constructs, Construct.SATELLITE_LAUNCHER)
            )}>All</WorkingCountToggle
        >
      </span>
    </fieldset>
  </ConstructOverview>
</section>

<style>
  input {
    text-align: right;
    background: #64748b;
  }
</style>
