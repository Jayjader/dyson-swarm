<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../../events";
  import type { EventsQueryAdapter } from "../../events/query";
  import { getClock } from "../../events/processes/clock";
  import { getPrimitive } from "../../hud/types";
  import type { BusEvent, EventTag } from "../../events/events";
  import { createWindowStore } from "./slidingWindow";

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
  // let windowSize = 100;
  // let windowStart = 0;
  // let slidingWindow = new Map<string, [number, number | bigint][]>();
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
            console.log({ data, tick });
            const [category, value] = data;
            slidingWindow.pushPoint(category, [tick, value]);
            /*
            const points = slidingWindow.get(category);
            if (points === undefined) {
              slidingWindow.set(category, [[tick, value]]);
            } else {
              if (points.length >= windowSize) {
                points.shift();
              }
              points.push([tick, value]);
            }
*/
          }
        });
    }
  }
  const unsubFromSim = simulation.subscribe((sim) => {
    const currentTick = getPrimitive(getClock(sim)).tick;
    if (currentTick !== lastTick) {
      console.log({ currentTick, lastTick });
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
  function pointsString(
    minTick: number,
    maxTick: number,
    points: Array<[number, number | bigint]>,
  ): string {
    const maxValue = Math.max(...points.map(([x, y]) => Number(y)));
    const minValue = Math.min(...points.map(([x, y]) => Number(y)));
    const tickRange = maxTick - minTick;
    const numberOfPoints = points.length;
    const valueRange = maxValue === minValue ? 1 : maxValue - minValue;
    console.log({
      minTick,
      maxTick,
      tickRange,
      numberOfPoints,
      minValue,
      maxValue,
      valueRange,
      points,
    });
    return points
      .map(([x, y]) => {
        if (typeof y === "number") {
          return `${100 * ((x - minTick) / tickRange)},${100 * (1 - (y - minValue) / valueRange)}`;
          // return `${100 * ((x - minTick) / tickRange)},${50}`;
        } else {
          // return `${100 * ((x - minTick) / tickRange)},${100 * (Number(y - BigInt(minValue)) / valueRange)}`;
          if (y < BigInt(Number.MAX_VALUE)) {
            return `${100 * ((x - minTick) / tickRange)},${100 * ((valueRange === 1 ? 0.45 : Number(y) - minValue) / valueRange)}`;
          }
          return `${100 * ((x - minTick) / tickRange)},${80}`;
        }
      })
      .join("\n");
  }
  const categoryColors = {
    "star-flux-emission": "#ffc803",
    "produce-power": "#1382C5",
    "produce-ore": "#682315",
    "produce-metal": "#567783",
  };
</script>

<section>
  <h2>History</h2>
  <button on:click={() => console.log({ $slidingWindow })}>
    debug points
  </button>
  <div class="flex-row items-stretch gap-1">
    <figure>
      <svg
        class="max-h-48 bg-slate-800"
        width="100%"
        viewBox="{0} {0} {100} {100}"
        preserveAspectRatio="xMinYMin"
      >
        {#each [...$slidingWindow] as [pointCategory, categoryPoints] (pointCategory)}
          <polyline
            data-category={pointCategory}
            fill="none"
            stroke={categoryColors[pointCategory] ?? "red"}
            stroke-linejoin="round"
            stroke-linecap="round"
            points={pointsString(
              Math.max(minTick, slidingWindow.windowConfig.windowStart),
              Math.min(
                maxTick,
                slidingWindow.windowConfig.windowStart +
                  slidingWindow.windowConfig.windowSize,
              ),
              categoryPoints,
            )}
          />
        {/each}
      </svg>
    </figure>
  </div>
</section>
