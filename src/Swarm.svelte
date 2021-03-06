<script lang="ts">
  export let count: number;
</script>

<div class="panel" data-augmented-ui="tl-clip tr-clip br-clip bl-clip">
  <h5 class="header">Swarm</h5>
  <span>{count} satellites</span>
</div>

<style>
  h5 {
    margin: 0;
  }
  .panel {
    height: min-content;
  }
</style>
