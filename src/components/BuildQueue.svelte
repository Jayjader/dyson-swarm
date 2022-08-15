<script lang="ts">
  import type { BuildOrder, Input } from "../types";
  import { Resource } from "../types";
  import { buildQueue } from "../store/fabricator";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { constructionCosts } from "../actions";
  import BuildQueueHeadItem from "./Fabricator.svelte";
  import BuildQueueItem from "./BuildQueueItem.svelte";

  let queue: BuildOrder[] = [];
  let costs: null | Input = null;
  buildQueue.subscribe((value) => {
    queue = value;
    costs = value.length > 0 ? constructionCosts[value[0].building] : null;
  });

  export let resources;
  const tweenedProgress = tweened(0, {
    duration: 150,
    easing: cubicOut,
    interpolate: (from, to) => (t) => from + Math.floor(t * (to - from)),
  });
  $: {
    if (costs !== null) {
      tweenedProgress.set(
        [...costs].reduce<number>(
          (accu, [resource, cost]) =>
            resource === Resource.ELECTRICITY
              ? accu
              : accu + Math.min(cost, resources?.[resource] ?? 0),
          0
        )
      );
    }
  }
</script>

<section style="grid-area: BuildQueue">
  <h2>Fabricator</h2>
  <BuildQueueHeadItem
    matsCurrent={[...costs].reduce(
      (accu, [resource, cost]) =>
        resource === Resource.ELECTRICITY
          ? accu
          : accu + Math.min(cost, resources?.[resource] ?? 0),
      0
    )}
    matsTotal={[...costs].reduce(
      (accu, [resource, cost]) =>
        resource === Resource.ELECTRICITY ? accu : accu + cost,
      0
    )}
    elecCurrent={resources[Resource.ELECTRICITY]}
    elecTotal={costs.get(Resource.ELECTRICITY)}
  />
  {#if queue.length > 0}
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
