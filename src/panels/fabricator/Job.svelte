<script lang="ts">
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
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
  import { ICON } from "../../icons";

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
  let snapshotOfFabricatorReceived = new Map([
    [Resource.ELECTRICITY, 0n],
    [Resource.METAL, 0n],
  ]);
  let elecPast = 0,
    elecTotal = 0n;
  let matsPast = 0,
    matsTotal = 0n;
  let lastTick = 0;

  const unsubSim = simulation.subscribe((sim) => {
    const simClockTick = getPrimitive(getClock(sim)).tick;
    if (lastTick === simClockTick) {
      return;
    }
    lastTick = simClockTick;
    const fab = getFabricator(sim);
    snapshotOfFabricatorReceived.clear();
    snapshotOfFabricatorReceived = (
      fab.received as {
        tag: "supply";
        resource: Resource.METAL | Resource.ELECTRICITY;
        amount: bigint;
        receivedTick: number;
      }[]
    ).reduce<Map<Resource.METAL | Resource.ELECTRICITY, bigint>>((accu, e) => {
      const { resource, receivedTick } = e;
      return receivedTick > lastTick
        ? accu
        : accu.set(resource, e.amount + (accu.get(resource) ?? 0n));
    }, snapshotOfFabricatorReceived);

    const nextOrder = fab.job;
    job =
      nextOrder === null
        ? nextOrder
        : [nextOrder, constructionCosts[nextOrder]];
    if (job !== pastJob) {
      elecTotal = job?.[1].get(Resource.ELECTRICITY) ?? 0n;
      matsTotal = job?.[1].get(Resource.METAL) ?? 0n;
      pastJob = job;
    }

    const elecCurrent = Number(
      snapshotOfFabricatorReceived.get(Resource.ELECTRICITY) ?? 0n
    );
    if (elecCurrent !== elecPast) {
      elecPast = elecCurrent;
      elecProgress.update(() => elecCurrent);
    }
    const matsCurrent = Number(
      snapshotOfFabricatorReceived.get(Resource.METAL) ?? 0n
    );
    if (matsCurrent !== matsPast) {
      matsPast = matsCurrent;
      matsProgress.update(() => matsCurrent);
    }
  });
  onDestroy(unsubSim);
</script>

<section
  class="mx-auto flex shrink-0 flex-grow flex-col items-center gap-2 rounded border-2 border-slate-700 bg-slate-500 text-slate-100"
>
  <div class="flex flex-row justify-evenly gap-2 self-stretch">
    <button
      class="my-1 ml-1 rounded border-2 border-stone-400 p-2 disabled:text-stone-600"
      on:click={() => {
        const busEvent = {
          tag: "command-clear-fabricator-job",
          afterTick: lastTick,
          timeStamp: performance.now(),
        };
        console.info(busEvent);
        simulation.broadcastEvent(busEvent);
      }}
      disabled={job === null}>Clear Job</button
    >
    <h3>Current Job</h3>
  </div>
  <div class="inline-block" style="width: 8rem">
    <figure class="flex flex-row flex-wrap items-center justify-between gap-1">
      <img
        src={job === undefined ? "./empty.png" : ICON[job?.at(0)]}
        alt={job?.at(0) ?? "Empty slot"}
        title={job?.at(0) ?? "None"}
        class="m-auto h-16 w-16 rounded border-2 border-slate-900 text-center"
      />
      <figcaption class="m-auto p-1">{job?.at(0) ?? "None"}</figcaption>
    </figure>
  </div>
  <h4 class="mt-3">Power</h4>
  <progress
    class="elec"
    aria-label="Materials availability to complete this build order"
    max={elecTotal}
    value={$elecProgress}
  >
    Power Need Satisfied: {(Math.floor($elecProgress) * 100) /
      (elecTotal > 0 ? Number(elecTotal) : 1)}%
  </progress>
  {snapshotOfFabricatorReceived.get(Resource.ELECTRICITY) ?? 0} / {elecTotal}
  <h4 class="mt-3">Metal</h4>
  <progress
    class="mats"
    aria-label="Materials availability to complete this build order"
    max={matsTotal}
    value={$matsProgress}
  >
    {#if job}
      Materials Need Satisfied: {Math.floor(
        ($matsProgress * 100) / Number(matsTotal)
      )}%
    {:else}
      No job
    {/if}
  </progress>
  {snapshotOfFabricatorReceived.get(Resource.METAL) ?? 0} / {matsTotal}
</section>
