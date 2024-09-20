<script lang="ts">
  import { ICON } from "../../icons";
  import { UNIT } from "../../units";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE, type SimulationStore } from "../../events";
  import { getFabricator } from "../../events/processes/fabricator";
  import type { Construct } from "../../gameRules";
  import { constructionCosts } from "../../gameRules";
  import { getClock } from "../../events/processes/clock";
  import { getPrimitive } from "../../hud/types";
  import WorkingCountToggle from "./WorkingCountToggle.svelte";

  const simulation = getContext(SIMULATION_STORE).simulation as SimulationStore;

  let lastTick = 0;
  let on = true;
  let buildOrder: Construct | null;
  let consumes = [];
  const unsubscribe = simulation.subscribe(async (sim) => {
    lastTick = getPrimitive(await getClock(simulation.adapters)).tick;
    on = getFabricator(sim).working;
    buildOrder = getFabricator(sim).job;
    if (buildOrder) {
      consumes = [...constructionCosts[buildOrder]].map(
        ([resource, amount]) => ({
          name: resource,
          value: amount,
          unit: UNIT[resource],
          icon: ICON[resource],
        }),
      );
    }
  });
  onDestroy(unsubscribe);

  function turnOn() {
    const commandEvent = {
      tag: "command-turn-on-fabricator",
      afterTick: lastTick,
      timeStamp: window.performance.now(),
    } as const;
    simulation.broadcastEvent(commandEvent);
  }
  function turnOff() {
    const commandEvent = {
      tag: "command-turn-off-fabricator",
      afterTick: lastTick,
      timeStamp: window.performance.now(),
    } as const;
    simulation.broadcastEvent(commandEvent);
  }
</script>

<div
  class="flex basis-full flex-row gap-1 rounded border-2 border-zinc-300 bg-slate-500 p-1 text-zinc-50"
>
  <img
    class="mr-1 aspect-square max-w-min self-center"
    src={ICON["fabricator"]}
    alt="Fabricator"
  />
  <div class="flex flex-1 flex-row flex-wrap justify-between gap-1">
    <div class="flex flex-col justify-between gap-1">
      <h3 class="font-bold text-zinc-50">Fabricator</h3>
      <fieldset class="flex flex-col">
        <legend class="font-bold">Working:</legend>
        <span class="flex flex-shrink-0 flex-grow-0 flex-row flex-wrap gap-2">
          <WorkingCountToggle on:click={turnOff} disabled={!on}
            >Off</WorkingCountToggle
          >
          <WorkingCountToggle on:click={turnOn} disabled={on}
            >On</WorkingCountToggle
          >
        </span>
      </fieldset>
    </div>
    <div class="flex flex-col justify-between gap-1">
      <div class="flex flex-col">
        <h5 class="font-bold">Consuming:</h5>
        <span class="flex flex-row gap-1">
          {#each consumes as { name, value, unit, icon } (name)}
            <img
              class="aspect-square h-4 max-w-min self-center"
              src={icon}
              alt={name}
              title={name}
            />
            <output>{value} {@html unit}</output>
          {/each}
        </span>
      </div>
      <div class="flex flex-col">
        <h5 class="font-bold">Producing:</h5>
        <span class="flex flex-row gap-1">
          <img
            class="aspect-square h-4 max-w-min self-center"
            src={ICON[buildOrder ?? "empty"]}
            alt={buildOrder ?? "empty"}
          />
          <output>{buildOrder == null ? "Nothing" : `1 ${buildOrder}`}</output>
        </span>
      </div>
    </div>
  </div>
</div>
