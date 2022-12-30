<!-- @component Recap of overall swarm state -->
<script lang="ts">
  export let swarm: { count: number };
</script>

<div class="flex flex-row">
  <div class="flex flex-row items-start gap-1">
    <img class="h-8" src="/satellite.svg" alt="Deployed Satellite" />
    <output name="swarm satellite count" class="block">{swarm.count}</output>
  </div>
</div>
