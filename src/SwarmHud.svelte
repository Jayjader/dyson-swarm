<!-- @component Recap of overall swarm state -->
<script lang="ts">
  export let swarm: { count: number };
</script>

<ul>
  <li title="Satellites deployed" data-icon="satellite">{swarm.count}</li>
</ul>

<style>
  ul {
    grid-area: swarm;
    list-style-position: inside;
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  li[data-icon="satellite"] {
    list-style-image: url("/satellite.svg");
  }

  ul li::marker {
    font-size: 2em;
  }
</style>
