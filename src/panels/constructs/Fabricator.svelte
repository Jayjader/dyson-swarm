<script lang="ts">
  import { ICON } from "../../icons";
  import { UNIT } from "../../units";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../../events";
  import { getFabricator } from "../../events/processes/fabricator";
  import type { Construct } from "../../gameRules";
  import { constructionCosts } from "../../gameRules";

  const simulation = getContext(SIMULATION_STORE).simulation;

  let buildOrder: Construct | null;
  let consumes = [];
  const unsubscribe = simulation.subscribe((sim) => {
    buildOrder = getFabricator(sim).job;
    if (buildOrder) {
      consumes = [...constructionCosts[buildOrder]].map(
        ([resource, amount]) => ({
          name: resource,
          value: amount,
          unit: UNIT[resource],
          icon: ICON[resource],
        })
      );
    }
  });
  onDestroy(unsubscribe);
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
        {#if buildOrder}
          <span class="flex flex-row gap-1">
            <img
              class="aspect-square h-4 max-w-min self-center"
              src={ICON[buildOrder]}
              alt={buildOrder}
            />
            <output>1 {buildOrder}</output>
          </span>
        {/if}
      </div>
    </div>
  </div>
</div>
