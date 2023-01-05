<script lang="ts">
  import type { BuildOrder } from "../types";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import { currentJob } from "./store";
  import type { Input } from "../types";
  import { constructionCosts } from "../actions";
  import { Resource } from "../gameStateStore";

  const matsProgress = tweened<number | undefined>(0, {
    duration: 150,
    easing: cubicOut,
  });
  const elecProgress = tweened<number | undefined>(1, {
    duration: 150,
    easing: cubicOut,
  });
  let buildOrder: undefined | BuildOrder;
  let costs: null | Input = null as null | Input;
  currentJob.subscribe((newVal) => {
    buildOrder = newVal;
    if (buildOrder) {
      console.debug({ command: "new-job-received", buildOrder }); // TODO: verify log level
      costs = constructionCosts[buildOrder.building];
      matsProgress.update(() => 0);
      elecProgress.update(() => 0);
    } else {
      costs = null;
      matsProgress.set(undefined);
      elecProgress.set(undefined);
    }
  });
  export let resources;
  $: matsCurrent = !costs
    ? 0
    : [...costs].reduce(
        (accu, [resource, cost]) =>
          resource === Resource.ELECTRICITY
            ? accu
            : accu + Math.min(cost, resources[resource]),
        0
      );
  $: matsTotal = !costs
    ? 1
    : [...costs].reduce(
        (accu, [resource, cost]) =>
          resource === Resource.ELECTRICITY ? accu : accu + cost,
        0
      );
  $: elecCurrent = resources[Resource.ELECTRICITY];
  $: elecTotal = !costs ? 1 : costs.get(Resource.ELECTRICITY);
  $: {
    matsProgress.update(() => matsCurrent);
    console.debug({ command: "job->set-mats-progress", current: matsCurrent });
  }
  $: {
    elecProgress.update(() => elecCurrent);
    console.debug({ command: "job->set-elec-progress", current: elecCurrent });
  }
</script>

<section
  class="mx-auto flex shrink-0 flex-grow flex-col items-center gap-2 rounded border-2 border-slate-700 bg-slate-500 text-slate-100"
  style="max-width: 45vw; min-width: 10rem"
>
  <div class="flex flex-row justify-around gap-2 self-stretch">
    <button
      class="my-1 rounded border-2 border-stone-400 px-2 disabled:text-stone-600"
      on:click={() => currentJob.set(undefined)}
      disabled={!costs}>Clear Job</button
    >
    <h3>Current Job</h3>
  </div>
  <span class="inline-block" style="width: 8rem">
    <SingleBuildOrder {buildOrder} />
  </span>
  <h4 class="mt-3">Power</h4>
  <progress
    class="elec"
    aria-label="Materials availability to complete this build order"
    max={elecTotal}
    value={$elecProgress}
  >
    Power Need Satisfied: {Math.floor($elecProgress * 100)}%
  </progress>
  {elecCurrent} / {elecTotal}
  <h4 class="mt-3">Metal</h4>
  <progress
    class="mats"
    aria-label="Materials availability to complete this build order"
    max={matsTotal}
    value={$matsProgress}
  >
    Materials Need Satisfied: {Math.floor($matsProgress * 100)}%
  </progress>
  {matsCurrent} / {matsTotal}
</section>
