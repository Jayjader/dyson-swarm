<!-- @component Recap of overall swarm state -->
<script lang="ts">
  export let count = 0;
</script>

<div class="flex flex-row">
  <div class="flex flex-row items-start gap-1">
    <img class="h-8" src="/satellite.svg" alt="Deployed Satellite" />
    <output name="swarm satellite count" class="block">{count}</output>
  </div>
</div>
