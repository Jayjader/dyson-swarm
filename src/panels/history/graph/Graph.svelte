<script lang="ts">
  import Axis from "./Axis.svelte";
  import colors from "./colors";
  import Line from "./Line.svelte";

  export let data: Array<
    [keyof typeof colors, [number, number][] | [number, bigint][]]
  > = [];
  export let fromX = 0;
  export let toX = 100;
  $: width = toX - fromX;
  const fromY = 0;
  const toY = 100;
  $: height = toY - fromY;
  const gutter = 10;
</script>

<svg
  class="flex-grow"
  viewBox="
{fromX - gutter / 2},
{fromY - gutter / 2},
{width + gutter},
{height + gutter}"
  width="100%"
  height="100%"
  preserveAspectRatio="none"
>
  <rect x={fromX} y="0" {height} {width} />
  <Axis {width} {height} {fromX} />
  {#each data as [category, points]}
    <Line {category} {points} {fromX} {toX} {height} />
  {/each}
</svg>
