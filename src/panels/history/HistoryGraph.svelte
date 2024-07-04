<script lang="ts">
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
  const axisWidth = 2;
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
  viewBox="{fromX - gutter / 2} {fromY - gutter / 2} {width + gutter} {height +
    gutter}"
  preserveAspectRatio="xMinYMin"
  bind:this={svg}
>
  <rect x={fromX} {height} {width} />
  <line
    id="x-axis"
    x1={fromX - axisWidth}
    x2={width}
    y1={height + 2}
    y2={height + 2}
    stroke="white"
    stroke-linecap="round"
    stroke-width={axisWidth}
  />
  <line
    id="x-axis-ticks"
    x1={fromX - axisWidth}
    x2={width + 2}
    y1={height + 2}
    y2={height + 2}
    stroke="gray"
    stroke-dasharray="1 9"
    stroke-linecap="round"
    stroke-width={axisWidth}
    stroke-dashoffset={fromX % 10}
  />
  <line
    id="y-axis"
    x1={-axisWidth}
    x2={-axisWidth}
    y1={height + axisWidth}
    y2={-axisWidth}
    stroke="white"
    stroke-linecap="round"
    stroke-width={axisWidth}
  />
  <line
    id="y-axis-ticks"
    x1="-2"
    x2="-2"
    y1={height + axisWidth}
    y2={-axisWidth}
    stroke="gray"
    stroke-dasharray="1 9"
    stroke-linecap="round"
    stroke-width={axisWidth}
  />
  {#each [...points] as [pointCategory, categoryPoints] (pointCategory)}
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
  {#each [...points.keys()] as pointCategory}
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
