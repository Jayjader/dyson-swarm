<script lang="ts">
  import colors from "./colors";
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
    let backfilled = undefined;
    for (let x = fromX; x < toX; x++) {
      if (x < points[0][0]) {
        backfilled = x;
        results.push(`${x},${height}`);
        continue;
      }
      if (backfilled !== undefined) {
        backfilled = undefined;
      }
      if (x > points.at(-1)![0]) {
        break;
      }
      let y = points.find((p) => p[0] === x)?.[1] ?? 0n;
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
    let minY = maxY;
    for (const p of points) {
      maxY = Math.max(maxY, p[1]);
      minY = Math.min(minY, p[1]);
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

  export let toX: number;
  export let fromX: number;
  export let height: number;
  export let category: keyof typeof colors;
  export let points: [number, number][] | [number, bigint][];

  $: dataString =
    typeof points[0][1] === "bigint"
      ? pointsStringForBigInts(points as [number, bigint][])
      : pointsString(points as [number, number][]);
</script>

<polyline
  data-category={category}
  fill="none"
  stroke={colors[category] ?? "red"}
  stroke-width="1px"
  stroke-linejoin="round"
  stroke-linecap="round"
  points={dataString}
  stroke-opacity="60%"
/>
