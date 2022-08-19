<script lang="ts">
  import type { BuildOrder, Input } from "../types";
  import { Resource } from "../types";
  import { buildQueue, currentJob } from "../store/fabricator";
  import { constructionCosts } from "../actions";
  import Job from "./Job.svelte";
  import BuildQueueItem from "./BuildQueueItem.svelte";

  let queue: BuildOrder[] = [];
  let costs: null | Input = null;
  buildQueue.subscribe((value) => {
    queue = value;
  });
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
  <h3>Queue</h3>
  {#if queue.length > 0}
    <button on:click={() => buildQueue.clear({ onlyAuto: true })}
      >Clear Repeat</button
    >
    <button on:click={() => buildQueue.clear()}>Clear Queue</button>
  {/if}
  <ol>
    {#each queue as buildOrder, i (buildOrder)}
      <li>
        <BuildQueueItem {buildOrder} />
      </li>
    {/each}
    <li class="no-decoration">
      <button>＋</button>
    </li>
  </ol>
</section>

<style>
  ol {
    border: 1px solid black;
    background-color: white;
    padding: 0.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  ol li {
    list-style: none;
    border: 1px solid black;
    background-color: #eeeeee;
  }
  .no-decoration {
    border: none;
    background: none;
  }
  ol button {
    border: 2px dashed black;
    background: none;
    width: 100%;
  }
</style>
