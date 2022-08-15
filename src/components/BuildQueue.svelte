<script lang="ts">
  import type { BuildOrder, Input } from "../types";
  import { isAuto, isRepeat, Resource } from "../types";
  import { data, store } from "../store/buildQueue";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { constructionCosts } from "../actions";
  import BuildQueueHeadItem from "./BuildQueueHeadItem.svelte";

  let queue: BuildOrder[] = [];
  let costs: null | Input = null;
  data.subscribe((value) => {
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
  <h2>Fabricator Queue</h2>
  {#if queue.length > 0}
    <button on:click={() => store.clear()}>Clear Queue</button>
  {/if}
  <ol>
    {#each queue as buildOrder, i (buildOrder)}
      <li>
        {#if i === 0}
          <BuildQueueHeadItem
            {buildOrder}
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
        {:else if isRepeat(buildOrder)}
          {buildOrder.count} x {buildOrder.building}
        {:else if isAuto(buildOrder)}
          {buildOrder.building} - 🗘 Auto
        {:else}
          {buildOrder.building}
        {/if}
      </li>
    {/each}
  </ol>
</section>
