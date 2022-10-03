<script lang="ts">
  import { fade } from "svelte/transition";
  import { clock } from "../time/store";
  export let swarm: { count: number };
  let estimatedRatePerTick;
  const slidingWindow = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  clock.subscribe(() => {
    slidingWindow.shift();
    slidingWindow.push(swarm.count);
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
  const tableHeaderClasses =
    "border-b-2 border-b-stone-600 rounded-br text-right pr-2";
</script>

<table class="border-2 rounded border-stone-400 border-separate p-1">
  <tr transition:fade={{ delay: 150, duration: 1500 }}>
    <th class={tableHeaderClasses}
      >Number needed to capture 100% of the star's output</th
    >
    <td>{2 ** 50}</td>
  </tr>
  <tr transition:fade={{ delay: 1000, duration: 1500 }}>
    <th class={tableHeaderClasses}>Percent of star's output captured</th>
    <td>{(swarm.count * 100) / 2 ** 50}</td>
  </tr>
  <tr
    transition:fade={{ delay: 1500, duration: 1500 }}
    title="Estimated over the past 10 ticks"
  >
    <th class={tableHeaderClasses}>Estimated rate of deployment</th>
    <td>{estimatedRatePerTick.toFixed(1)}/tick</td>
  </tr>
  <tr
    transition:fade={{ delay: 2000, duration: 1500 }}
    title="Estimated over the past 10 ticks"
  >
    <th class={tableHeaderClasses}
      >Estimated time to reach 100% at current rate:</th
    >
    <td>
      {Math.floor(
        (2 ** 50 - swarm.count) /
          estimatedRatePerTick /
          (365 * 24 * 3600 * 1000)
      )} tick-years
    </td>
  </tr>
</table>
