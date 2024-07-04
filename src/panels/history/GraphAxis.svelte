<script>
  export let axisWidth = 2;
  export let fromX;
  export let width;
  export let height;
  $: xAxisStart = fromX - axisWidth;
  $: xAxisEnd = fromX + width + axisWidth;
  $: xAxisY = height + axisWidth;
  $: yAxisStart = height + axisWidth;
  $: yAxisEnd = -axisWidth;
  $: yAxisX = Math.max(-axisWidth, fromX);
</script>

<line
  id="x-axis"
  x1={xAxisStart}
  x2={xAxisEnd}
  y1={xAxisY}
  y2={xAxisY}
  stroke="white"
  stroke-linecap="round"
  stroke-width={axisWidth}
/>
<line
  id="x-axis-ticks"
  x1={xAxisStart}
  x2={xAxisEnd}
  y1={xAxisY}
  y2={xAxisY}
  stroke="gray"
  stroke-dasharray="1 9"
  stroke-linecap="round"
  stroke-width={axisWidth}
  stroke-dashoffset={fromX % 10}
/>
<line
  id="y-axis"
  x1={yAxisX}
  x2={yAxisX}
  y1={yAxisStart}
  y2={yAxisEnd}
  stroke="white"
  stroke-linecap="round"
  stroke-width={axisWidth}
/>
<line
  id="y-axis-ticks"
  x1={yAxisX}
  x2={yAxisX}
  y1={yAxisStart}
  y2={yAxisEnd}
  stroke="gray"
  stroke-dasharray="1 9"
  stroke-linecap="round"
  stroke-width={axisWidth}
/>
