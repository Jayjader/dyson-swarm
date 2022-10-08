<script lang="ts">
  import type { SingleBuildOrder } from "../types";
  import { constructionCosts } from "../actions";
  import { ICON } from "../icons";
  import { unit } from "../units";
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
          unit: unit[resource],
          icon: ICON[resource],
        })
      );
      console.debug({ consumes });
    }
  });
</script>

<div
  class="basis-full p-1 gap-1 flex flex-row border-2 rounded border-zinc-300 text-zinc-300"
>
  <img
    class="self-center max-w-min aspect-square mr-1"
    src="/fabricator.png"
    alt="fabricator"
  />
  <div class="flex-1 flex flex-row flex-wrap justify-between gap-1">
    <div class="flex flex-col gap-1 justify-between">
      <h4 class="font-bold text-zinc-50">Fabricator</h4>
    </div>
    <div class="flex flex-col gap-1 justify-between">
      <div class="flex flex-col">
        <h5 class="font-bold">Consuming:</h5>
        <span class="flex flex-row gap-1">
          {#each consumes as { name, value, unit, icon } (name)}
            <img
              class="self-center max-w-min h-4 aspect-square"
              src={icon}
              alt={name}
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
              class="self-center max-w-min h-4 aspect-square"
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
