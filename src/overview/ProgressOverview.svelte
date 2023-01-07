<script lang="ts">
  import { fade } from "svelte/transition";
  import { getPrimitive } from "../time/types";
  import ProgressHeader from "./ProgressHeader.svelte";
  import { getClock } from "../events/processes/clock";
  import { getContext } from "svelte";
  import { SIMULATION_STORE } from "../events";

  export let count = 0;
  let estimatedRatePerTick = 0,
    lastTick = 0;
  const slidingWindow = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const simulation = getContext(SIMULATION_STORE).simulation;
  simulation.subscribe((sim) => {
    const tick = getPrimitive(getClock(sim)).tick;
    if (tick === lastTick) {
      return;
    }
    lastTick = tick;
    slidingWindow.shift();
    slidingWindow.push(count);
    const [averageRate] = slidingWindow
      .slice(1)
      .reduce(
        ([sum, prev], next) => [sum + next - prev, next],
        [0, slidingWindow[0]]
      );
    estimatedRatePerTick = averageRate / 9;
    console.debug({
      command: "calculate-new-rate-per-tick",
      slidingWindow,
      averageRate,
      estimatedRatePerTick,
    });
  });
  const swarmSizeGoal = 2 ** 50;
</script>

<table
  class="border-separate rounded border-2 border-slate-100 p-1 text-slate-100"
>
  <tr transition:fade={{ delay: 150, duration: 1500 }}>
    <ProgressHeader
      >Number needed to capture 100% of the star's output</ProgressHeader
    >
    <td>{swarmSizeGoal}</td>
  </tr>
  <tr transition:fade={{ delay: 1000, duration: 1500 }}>
    <ProgressHeader>Percent of star's output captured</ProgressHeader>
    <td>{(count * 100) / swarmSizeGoal}</td>
  </tr>
  <tr
    transition:fade={{ delay: 1500, duration: 1500 }}
    title="Estimated over the past 10 ticks"
  >
    <ProgressHeader>Estimated rate of deployment</ProgressHeader>
    <td>{estimatedRatePerTick.toFixed(1)}/tick</td>
  </tr>
  <tr
    transition:fade={{ delay: 2000, duration: 1500 }}
    title="Estimated over the past 10 ticks"
  >
    <ProgressHeader
      >Estimated time to reach 100% at current rate:</ProgressHeader
    >
    <td>
      {Math.floor(
        (swarmSizeGoal - count) /
          estimatedRatePerTick /
          (365 * 24 * 3600 * 1000)
      )} tick-years
    </td>
  </tr>
</table>
