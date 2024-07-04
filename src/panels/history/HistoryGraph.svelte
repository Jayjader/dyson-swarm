<script lang="ts">
  import GraphAxis from "./GraphAxis.svelte";

  export let points: Map<
    keyof typeof categoryColors,
    ([number, number] | [number, bigint])[]
  > = new Map();
  export let fromX = 0;
  export let toX = 100;
  const categoryColors = {
    "star-flux-emission": "#ffc803",
    "produce-power": "#1382C5",
    "produce-ore": "#682315",
    "produce-metal": "#567783",
    "mine-planet-surface": "#238a22",
  } as const;
  $: width = toX - fromX;
  let svg: SVGElement;
  const fromY = 0;
  const toY = 100;
  $: height = toY - fromY;
  const gutter = 10;
  function pointsStringForBigInts(points: Array<[number, bigint]>): string {
    let results: string[] = [];
    if (points.length === 0) {
      return "";
    }
    let maxY = points[0][1];
    for (const p of points) {
      if (maxY < p[1]) {
        maxY = p[1];
      }
    }
    for (let x = fromX; x < toX; x++) {
      if (x < points[0][0]) {
        results.push(`${x},${height}`);
        continue;
      }
      if (x > points.at(-1)![0]) {
        break;
      }
      let y = points.find((p) => p[0] === x - fromX)?.[1] ?? 0n;
      results.push(`${x},${(BigInt(height) * (maxY - y)) / maxY}`);
    }
    return results.join("\n");
  }
  function pointsString(points: Array<[number, number]>): string {
    let results: string[] = [];
    if (points.length === 0) {
      return "";
    }
    let maxY = points[0][1];
    for (const p of points) {
      maxY = Math.max(maxY, p[1]);
    }
    for (let x = fromX; x < toX; x++) {
      if (x < points[0][0]) {
        results.push(`${x},${height}`);
        continue;
      }
      if (x > points.at(-1)![0]) {
        break;
      }
      let y = points.find((p) => p[0] === x - fromX)?.[1] ?? 0;
      results.push(`${x},${Math.round((maxY - y) / height)}`);
    }
    return results.join("\n");
  }
</script>

<svg
  class="max-h-48 flex-grow"
  viewBox="
{fromX - gutter / 2},
{fromY - gutter / 2},
{width + gutter},
{height + gutter}"
  preserveAspectRatio="xMinYMin"
  bind:this={svg}
>
  <rect x={fromX} y="0" {height} {width} />
  <GraphAxis {width} {height} {fromX} />
  {#each points.entries() as [pointCategory, categoryPoints]}
    <polyline
      data-category={pointCategory}
      fill="none"
      stroke={categoryColors[pointCategory] ?? "red"}
      stroke-width="1px"
      stroke-linejoin="round"
      stroke-linecap="round"
      points={typeof categoryPoints[0][1] == "bigint"
        ? pointsStringForBigInts(categoryPoints)
        : pointsString(categoryPoints)}
    />
  {/each}
</svg>
<ul class="legend">
  {#each points.keys() as pointCategory}
    <li
      data-catagory={pointCategory}
      style="color: {categoryColors[pointCategory] ?? 'red'}"
    >
      {pointCategory.replaceAll("-", " ")}
    </li>
  {/each}
</ul>

<style>
  .legend {
    text-transform: capitalize;
  }
</style>
