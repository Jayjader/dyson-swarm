<!-- @component Recap of overall swarm state -->
<script lang="ts">
  export let count = 0;
  const formatter = Intl.NumberFormat([], { useGrouping: true });
</script>

<div class="flex flex-row items-start gap-1">
  <img class="h-8" src="/satellite.svg" alt="Deployed Satellite" />
  <output
    name="swarm satellite count"
    class="block"
    style="overflow-wrap: anywhere"
  >
    {formatter.format(count)}
  </output>
</div>
