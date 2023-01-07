<script lang="ts">
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import { currentJob } from "./store";
  import type { Input } from "../types";
  import { constructionCosts } from "../actions";
  import { Construct, Resource } from "../gameStateStore";
  import { getContext } from "svelte";
  import { SIMULATION_STORE } from "../events";
  import { getFabricator } from "../events/processes/fabricator";

  export let resources = new Map();
  const simulation = getContext(SIMULATION_STORE).simulation;

  const matsProgress = tweened<number>(0, {
    duration: 150,
    easing: cubicOut,
  });
  const elecProgress = tweened<number>(1, {
    duration: 150,
    easing: cubicOut,
  });
  type Job = [Construct, Input] | null;
  let job = null as Job,
    pastJob = null as Job;
  simulation.subscribe((sim) => {
    const nextOrder = getFabricator(sim).job;
    job = !nextOrder ? null : [nextOrder, constructionCosts[nextOrder]];
  });
  let elecCurrent = 0,
    elecPast = 0,
    elecTotal = 0;

  let matsCurrent = 0,
    matsPast = 0,
    matsTotal;
  $: {
    elecCurrent = resources.get(Resource.ELECTRICITY) ?? 0;
    if (elecCurrent !== elecPast) {
      // console.debug({
      //   command: "job->set-elec-progress",
      //   current: elecCurrent,
      //   past: elecPast,
      // });
      elecProgress.update(() => elecCurrent);
      elecPast = elecCurrent;
    }
    if (!job) {
      matsProgress.update(() => 0);
      elecProgress.update(() => 0);
      matsCurrent = 0;
      matsPast = 0;
      matsTotal = 1;
      elecTotal = 1;
    } else {
      matsCurrent = [...job[1]].reduce(
        (accu, [resource, cost]) =>
          resource === Resource.ELECTRICITY
            ? accu
            : accu + Math.min(cost, resources.get(resource) ?? 0),
        0
      );
      if (matsCurrent !== matsPast) {
        matsProgress.update(() => matsCurrent);
        // console.debug({
        //   command: "job->set-mats-progress",
        //   current: matsCurrent,
        // });
        matsPast = matsCurrent;
      }
      if (job !== pastJob) {
        elecTotal = job[1].get(Resource.ELECTRICITY) ?? 0;
        matsTotal = [...job[1]].reduce(
          (accu, [resource, cost]) =>
            resource === Resource.ELECTRICITY ? accu : accu + cost,
          0
        );
        // console.debug({
        //   command: "job->new-job-totals",
        //   job,
        //   pastJob,
        //   elecTotal,
        //   matsTotal,
        // });
        pastJob = job;
      }
    }
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
      disabled={!job}>Clear Job</button
    >
    <h3>Current Job</h3>
  </div>
  <span class="inline-block" style="width: 8rem">
    <SingleBuildOrder buildOrder={!job ? undefined : { building: job[0] }} />
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
