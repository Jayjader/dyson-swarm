<script lang="ts">
  import type { SingleBuildOrder } from "../types";
  import { constructionCosts } from "../actions";
  import { ICON } from "../icons";
  import { UNIT } from "../units";
  import { currentJob } from "../fabricator/store";

  let buildOrder: SingleBuildOrder | undefined;
  let consumes = [];
  currentJob.subscribe((newJob) => {
    buildOrder = newJob;
    if (buildOrder) {
      consumes = [...constructionCosts[buildOrder.building]].map(
        ([resource, amount]) => ({
          name: resource,
          value: amount,
          unit: UNIT[resource],
          icon: ICON[resource],
        })
      );
    }
  });
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
      <h4 class="font-bold text-zinc-50">Fabricator</h4>
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
              src={ICON[buildOrder.building]}
              alt={buildOrder.building}
            />
            <output>1 {buildOrder.building}</output>
          </span>
        {/if}
      </div>
    </div>
  </div>
</div>
