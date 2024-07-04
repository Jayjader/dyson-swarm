<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../../events";
  import type { EventsQueryAdapter } from "../../events/query";
  import { getClock } from "../../events/processes/clock";
  import { getPrimitive } from "../../hud/types";
  import type { BusEvent, EventTag } from "../../events/events";
  import { createWindowStore } from "./slidingWindow";
  import HistoryGraph from "./HistoryGraph.svelte";

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
        break;
      case "satellite-flux-reflection":
        return [e.tag, e.flux] as const;
      case "construct-fabricated":
        return [`fabricated-${e.construct}`, 1] as const;
      case "circuit-breaker-tripped":
        break;
      case "circuit-breaker-reset":
        break;
      case "working-count-set":
        break;
      case "fabricator-turned-on":
        break;
      case "fabricator-turned-off":
        break;
      default:
        return undefined;
    }
  };

  export let eventsAdapter: EventsQueryAdapter;
  const simulation = getContext(SIMULATION_STORE).simulation;

  let lastTick = 0;
  const slidingWindow = createWindowStore();
  let windowPromise: Promise<void>;
  $: {
    if (windowPromise === undefined) {
      const { windowStart, windowSize } = slidingWindow.windowConfig;
      windowPromise = eventsAdapter
        .getTickEventsRange(windowStart, windowStart + windowSize)
        .then((events) => {
          for (const [tick, event] of events) {
            const data = getPointData(event);
            if (data === undefined) {
              continue;
            }
            const [category, value] = data;
            slidingWindow.pushPoint(category, [tick, value]);
          }
        });
    }
  }
  const unsubFromSim = simulation.subscribe((sim) => {
    const currentTick = getPrimitive(getClock(sim)).tick;
    if (currentTick !== lastTick) {
      lastTick = currentTick;
      windowPromise = undefined;
    }
  });
  onDestroy(unsubFromSim);

  let categories: string[] = [];
  const unsubFromWindow = slidingWindow.subscribe((map) => {
    categories = [...map.keys()];
  });
  onDestroy(unsubFromWindow);
  $: values = [...$slidingWindow.values()];

  // $: minTick = Math.min(...values.map(([x, y]) => Number(x)));
  $: minTick = values.reduce<number>(
    (acc, [[x]]) => (acc > x ? x : acc),
    Number.POSITIVE_INFINITY,
  );
  // $: maxTick = Math.max(...values.map(([x, y]) => Number(x)));
  $: maxTick = values.reduce<number>(
    (acc, [[x]]) => (acc < x ? x : acc),
    minTick,
  );
</script>

<section>
  <h2>History</h2>
  <button
    class="m-2 rounded border-2 border-gray-900 px-2"
    on:click={() => console.log({ $slidingWindow })}
  >
    debug points
  </button>
  <div class="flex flex-row items-stretch gap-1">
    <HistoryGraph
      points={$slidingWindow}
      toX={lastTick}
      fromX={lastTick - 100}
    />
  </div>
</section>
