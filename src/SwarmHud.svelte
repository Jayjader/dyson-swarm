<!-- @component Recap of overall swarm state -->
<script lang="ts">
  export let swarm: { count: number };
</script>

<ul><li data-icon="satellite">{swarm.count}</li></ul>

<style>
  ul {
    grid-area: swarm;
    list-style-position: outside;
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  li[data-icon="satellite"] {
    list-style-image: url("/satellite.svg");
  }

  ul li::marker {
    font-size: clamp(1em, calc(100vw / 16), 6em);
  }
</style>
