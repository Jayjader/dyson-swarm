<script lang="ts">
  import type { Input } from "../types";
  import { currentJob } from "./store";
  import { constructionCosts } from "../actions";
  import Job from "./Job.svelte";
  import { Resource, type Resources } from "../gameStateStore";

  let costs: null | Input = null;
  currentJob.subscribe((job) => {
    costs = job === undefined ? null : constructionCosts[job.building];
  });

  export let resources: Resources;
  export let visible = true;
</script>

<section class:visible>
  <h2>Fabricator</h2>
  <h3>Current Job</h3>
  <button
    on:click={currentJob.set.bind(this, undefined)}
    disabled={costs === undefined}>Clear Job</button
  >
  <Job
    matsCurrent={costs
      ? [...costs].reduce(
          (accu, [resource, cost]) =>
            resource === Resource.ELECTRICITY
              ? accu
              : accu + Math.min(cost, resources[resource]),
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
    elecTotal={(costs && costs.get(Resource.ELECTRICITY)) ?? 1}
  />
</section>
