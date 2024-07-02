<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../../events";
  import type { EventsQueryAdapter } from "../../events/query";
  import { getClock } from "../../events/processes/clock";
  import { getPrimitive } from "../../hud/types";
  import type { BusEvent } from "../../events/events";

  const getPoint = (e: BusEvent) => {
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
  let points = new Map<string, Array<[number, number | bigint]>>();
  const unsubFromSim = simulation.subscribe(async (sim) => {
    const currentTick = getPrimitive(getClock(sim)).tick;
    if (currentTick > lastTick) {
      lastTick = currentTick;
      const events = await eventsAdapter.getTickEvents(currentTick);
      for (const event of events) {
        const point = getPoint(event);
        if (point !== undefined) {
          const [pointCategory, value] = point;
          let categoryPoints = points.get(pointCategory);
          if (categoryPoints === undefined) {
            points.set(pointCategory, [[currentTick, value]]);
          } else {
            categoryPoints.push([currentTick, value]);
          }
        }
      }
      points = points;
      /* */
    }
  });
  onDestroy(unsubFromSim);

  $: keys = [...points.keys()];
  $: values = [...points.values()];

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
  function pointString(
    minTick: number,
    maxTick: number,
    maxValue: number,
    minValue: number,
    points: Array<[number, number | bigint]>,
  ): string {
    const tickRange = maxTick - minTick;
    const numberOfPoints = points.length;
    const valueRange = maxValue === minValue ? 1 : maxValue - minValue;
    console.log({
      minTick,
      maxTick,
      tickRange,
      numberOfPoints,
      valueRange,
      points,
    });
    return points
      .map(([x, y]) => {
        if (typeof y === "number") {
          return `${100 * ((x - minTick) / tickRange)},${100 * ((y - minValue) / valueRange)}`;
        } else {
          return `${100 * ((x - minTick) / tickRange)},${100 * (Number(y - BigInt(minValue)) / valueRange)}`;
        }
      })
      .join("\n");
  }
</script>

<section>
  <h2>History</h2>
  <button on:click={() => console.log({ reactive: { keys, values }, points })}>
    debug points
  </button>
  <div class="flex-row items-stretch gap-1">
    <figure>
      <svg
        class="max-h-48 bg-slate-500"
        width="100%"
        viewBox="{0} {0} {100} {100}"
        preserveAspectRatio="xMinYMin"
      >
        {#each keys as pointCategory (pointCategory)}
          {@const categoryPoints = points.get(pointCategory) ?? []}
          {@const maxValue = Math.max(
            ...categoryPoints.map(([x, y]) => Number(y)),
          )}
          {@const minValue = Math.min(
            ...categoryPoints.map(([x, y]) => Number(y)),
          )}
          <polyline
            fill="none"
            stroke="red"
            stroke-linejoin="round"
            stroke-linecap="round"
            points={pointString(
              minTick,
              maxTick,
              maxValue,
              minValue,
              categoryPoints,
            )}
          />
        {/each}
      </svg>
    </figure>
  </div>
</section>
