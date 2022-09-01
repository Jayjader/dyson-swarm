<script lang="ts">
  import type { Input } from "../types";
  import { Resource } from "../types";
  import { currentJob } from "./store";
  import { constructionCosts } from "../actions";
  import Job from "./Job.svelte";
  import BuildQueue from "./BuildQueue.svelte";

  let costs: null | Input = null;
  currentJob.subscribe((job) => {
    costs = job === undefined ? null : constructionCosts[job.building];
  });

  export let resources;
</script>

<section style="grid-area: BuildQueue">
  <h2>Fabricator</h2>
  <h3>Current Job</h3>
  {#if $currentJob !== undefined}
    <button on:click={() => currentJob.set(undefined)}>Clear Job</button>
  {/if}
  <Job
    matsCurrent={costs
      ? [...costs].reduce(
          (accu, [resource, cost]) =>
            resource === Resource.ELECTRICITY
              ? accu
              : accu + Math.min(cost, resources?.[resource] ?? 0),
          0
        )
      : 1}
    matsTotal={costs
      ? [...costs].reduce(
          (accu, [resource, cost]) =>
            resource === Resource.ELECTRICITY ? accu : accu + cost,
          0
        )
      : 1}
    elecCurrent={resources[Resource.ELECTRICITY]}
    elecTotal={costs ? costs.get(Resource.ELECTRICITY) : 1}
  />
  <BuildQueue />
</section>
