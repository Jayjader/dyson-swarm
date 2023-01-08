<script lang="ts">
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import SingleBuildOrder from "./SingleBuildOrder.svelte";
  import {
    type Construct,
    constructionCosts,
    type Input,
    Resource,
  } from "../../gameRules";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../../events";
  import { getFabricator } from "../../events/processes/fabricator";
  import { getPrimitive } from "../../hud/types";
  import { getClock } from "../../events/processes/clock";

  type Job = [Construct, Input] | null;

  const simulation = getContext(SIMULATION_STORE).simulation;

  const matsProgress = tweened<number>(0, {
    duration: 150,
    easing: cubicOut,
  });
  const elecProgress = tweened<number>(1, {
    duration: 150,
    easing: cubicOut,
  });

  let job = null as Job,
    pastJob = null as Job;
  let current;
  let elecPast = 0,
    elecTotal = 0;
  let matsPast = 0,
    matsTotal = 0;
  let lastTick = 0;

  const unsubSim = simulation.subscribe((sim) => {
    lastTick = getPrimitive(getClock(sim)).tick;
    const fab = getFabricator(sim);
    current = (
      fab.received as {
        tag: "supply";
        resource: Resource.METAL | Resource.ELECTRICITY;
        amount: number;
      }[]
    ).reduce<Map<Resource.METAL | Resource.ELECTRICITY, number>>(
      (accu, e) => {
        const resource = e.resource;
        return accu.set(resource, e.amount + accu.get(resource) ?? 0);
      },
      new Map([
        [Resource.ELECTRICITY, 0],
        [Resource.METAL, 0],
      ])
    );

    const nextOrder = fab.job;
    job = !nextOrder ? null : [nextOrder, constructionCosts[nextOrder]];
    if (job !== pastJob) {
      elecTotal = job?.[1].get(Resource.ELECTRICITY) ?? 0;
      matsTotal = job?.[1].get(Resource.METAL) ?? 0;
      pastJob = job;
      if (job === null) {
        elecProgress.set(0);
        matsProgress.set(0);
      }
    }

    const elecCurrent = current.get(Resource.ELECTRICITY) ?? 0;
    if (elecCurrent !== elecPast) {
      elecPast = elecCurrent;
      elecProgress.update(() => elecCurrent);
    }
    const matsCurrent = current.get(Resource.METAL) ?? 0;
    if (matsCurrent !== matsPast) {
      matsPast = matsCurrent;
      matsProgress.update(() => matsCurrent);
    }
  });
  onDestroy(unsubSim);
</script>

<section
  class="mx-auto flex shrink-0 flex-grow flex-col items-center gap-2 rounded border-2 border-slate-700 bg-slate-500 text-slate-100"
  style="max-width: 45vw; min-width: 10rem"
>
  <div class="flex flex-row justify-around gap-2 self-stretch">
    <button
      class="my-1 rounded border-2 border-stone-400 px-2 disabled:text-stone-600"
      on:click={() => {
        const busEvent = {
          tag: "command-clear-fabricator-job",
          afterTick: lastTick,
          timeStamp: performance.now(),
        };
        console.info(busEvent);
        simulation.broadcastEvent(busEvent);
      }}
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
  {current.get(Resource.ELECTRICITY)} / {elecTotal}
  <h4 class="mt-3">Metal</h4>
  <progress
    class="mats"
    aria-label="Materials availability to complete this build order"
    max={matsTotal}
    value={$matsProgress}
  >
    Materials Need Satisfied: {Math.floor($matsProgress * 100)}%
  </progress>
  {current.get(Resource.METAL)} / {matsTotal}
</section>
