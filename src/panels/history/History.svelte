<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE, type SimulationStore } from "../../events";
  import { getClock } from "../../events/processes/clock";
  import type { BusEvent } from "../../events/events";
  import HistoryGraph from "./graph/Graph.svelte";
  import colors from "./graph/colors";
  import { getPrimitive } from "../../simulation/clockStore";

  const getPointData = (e: BusEvent) => {
    switch (e.tag) {
      case "star-flux-emission":
        return [e.tag, e.flux] as const;
      case "mine-planet-surface":
        return [e.tag, e.minerCount] as const;
      case "produce":
        return [`produce-${e.resource}`, e.amount] as const;
      case "draw":
        return [`draw-${e.resource}`, e.amount] as const;
      case "supply":
        return [`supply-${e.resource}`, e.amount] as const;
      case "launch-satellite":
        return [e.tag, e.count ?? 1] as const;
      case "satellite-flux-reflection":
        return [e.tag, e.flux] as const;
      case "construct-fabricated":
        return [`fabricated-${e.construct}`, 1] as const;
      default:
        return undefined;
    }
  };

  const simulation = (
    getContext(SIMULATION_STORE) as { simulation: SimulationStore }
  ).simulation;

  // todo: controls for window size
  // todo: controls for window start/end
  // todo(last?): timeslice

  let lastTick = 0;
  let slidingWindow = new Map<
    keyof typeof colors,
    [number, number][] | [number, bigint][]
  >();
  let windowPromise: Promise<void> | undefined;
  $: {
    if (windowPromise === undefined) {
      windowPromise = queryEvents();
    }
  }
  const unsubFromSim = simulation.subscribe(async () => {
    const currentTick = getPrimitive(await getClock(simulation.adapters)).tick;
    if (currentTick !== lastTick) {
      lastTick = currentTick;
      windowPromise = undefined;
    }
  });
  onDestroy(unsubFromSim);
  const windowSize = 300;
  async function queryEvents() {
    const events = await simulation.adapters.events.read.getTickEventsRange(
      lastTick - windowSize,
      lastTick,
    );
    slidingWindow.clear();
    for (const [tick, event] of events) {
      const data = getPointData(event);
      if (data === undefined) {
        continue;
      }
      const [category, value] = data;
      const points = slidingWindow.get(category);
      if (points === undefined) {
        slidingWindow.set(category, [[tick, value as any]]);
      } else {
        if (points.length >= windowSize) {
          points.shift();
        }
        const existingPointForTickIndex = points.findIndex(
          ([existingTick]) => existingTick === tick,
        );
        if (existingPointForTickIndex === -1) {
          points.push([tick, value] as any);
        } else {
          points[existingPointForTickIndex][1] += value as any;
        }
      }
    }
    slidingWindow = slidingWindow;
  }

  let hidden = new Set();
</script>

<section>
  <h2>History</h2>
  <button
    class="m-2 rounded border-2 border-gray-900 px-2"
    on:click={() => {
      console.log({ slidingWindowMap: [...slidingWindow] });
      simulation.adapters.eventSources.debugSources();
      simulation.adapters.snapshots.debugSnapshots();
    }}
  >
    debug points
  </button>
  <div class="flex flex-row items-stretch gap-1">
    <HistoryGraph
      data={[...slidingWindow.entries()].filter(([key]) => !hidden.has(key))}
      toX={lastTick}
      fromX={lastTick - windowSize}
    />
    <ul class="legend">
      <li class="text-slate-200">
        <button
          class="border-gray-slate m-2 rounded border-2 p-2"
          on:click={() => {
            for (const key of slidingWindow.keys()) {
              hidden.add(key);
            }
            hidden = hidden;
          }}
        >
          Hide All
        </button>
        <button
          class="border-gray-slate m-2 rounded border-2 p-2"
          on:click={() => {
            hidden.clear();
            hidden = hidden;
          }}
        >
          Show All
        </button>
      </li>
      {#each [...slidingWindow.keys()].toSorted() as pointCategory}
        <li
          data-catagory={pointCategory}
          style="color: {colors[pointCategory] ?? 'red'}"
        >
          <input
            type="checkbox"
            checked={!hidden.has(pointCategory)}
            on:change={() => {
              if (hidden.has(pointCategory)) {
                hidden.delete(pointCategory);
              } else {
                hidden.add(pointCategory);
              }
              hidden = hidden;
            }}
          />
          {pointCategory.replaceAll("-", " ")}
        </li>
      {/each}
    </ul>
  </div>
</section>

<style>
  .legend {
    text-transform: capitalize;
  }
</style>
