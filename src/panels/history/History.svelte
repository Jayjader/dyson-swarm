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
      /*
      case "outside-clock-tick":
        break;
      case "simulation-clock-tick":
        break;
      case "command-simulation-clock-play":
        break;
      case "simulation-clock-play":
        break;
      case "command-simulation-clock-pause":
        break;
      case "simulation-clock-pause":
        break;
      case "command-simulation-clock-indirect-pause":
        break;
      case "simulation-clock-indirect-pause":
        break;
      case "command-simulation-clock-indirect-resume":
        break;
      case "simulation-clock-indirect-resume":
        break;
      case "command-simulation-clock-start-editing-speed":
        break;
      case "simulation-clock-editing-speed":
        break;
      case "command-simulation-clock-set-speed":
        break;
      case "simulation-clock-new-speed":
        break;
*/
      case "star-flux-emission":
        return [e.tag, e.flux] as const;
      case "mine-planet-surface":
        return [e.tag, e.minerCount] as const;
      case "produce":
        return [`produce-${e.resource}`, e.amount] as const;
      case "draw":
        break;
      case "supply":
        break;
      case "launch-satellite":
        break;
      case "satellite-flux-reflection":
        break;
      case "construct-fabricated":
        break;
      case "circuit-breaker-tripped":
        break;
      /*
      case "command-reset-circuit-breaker":
        break;
*/
      case "circuit-breaker-reset":
        break;
      /*
      case "command-trip-circuit-breaker":
        break;
      case "command-set-working-count":
        break;
*/
      case "working-count-set":
        break;
      /*
      case "command-turn-on-fabricator":
        break;
*/
      case "fabricator-turned-on":
        break;
      /*
      case "command-turn-off-fabricator":
        break;
*/
      case "fabricator-turned-off":
        break;
      /*
      case "command-set-fabricator-queue":
        break;
      case "fabricator-queue-set":
        break;
      case "command-clear-fabricator-job":
        break;
*/
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
