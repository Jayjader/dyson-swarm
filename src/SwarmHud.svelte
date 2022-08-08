<!-- @component Recap of overall swarm state -->
<script lang="ts">
  import { fade } from "svelte/transition";
  export let swarm: { count: number };
  let oldCount = null;
  let lastChange =
    new Date().valueOf(); /* todo: use game clock instead of real world clock to take into account play/pause/speed-up*/
  let estimatedRatePerMilliSecond;
  $: {
    if (oldCount !== null) {
      const diff = swarm.count - oldCount;
      if (diff !== 0) {
        const now = new Date().valueOf();
        estimatedRatePerMilliSecond = diff / (now - lastChange);
        lastChange = now;
      }
    }
    oldCount = swarm.count;
  }
</script>

<div>
  <ul>
    <li title="Satellites deployed" data-icon="satellite">{swarm.count}</li>
  </ul>
  {#if swarm.count > 0}
    <table>
      <tr transition:fade={{ delay: 150, duration: 1500 }}>
        <th>Number needed to capture 100% of the star's output</th><td
          >{2 ** 50}</td
        ></tr
      >
      <tr transition:fade={{ delay: 1000, duration: 1500 }}
        ><th>Percent of star's output captured</th><td
          >{(swarm.count * 100) / 2 ** 50}</td
        ></tr
      >
      <tr
        transition:fade={{ delay: 1500, duration: 1500 }}
        title="Estimated when new satellite launched"
        ><th>Estimated rate of deployment</th><td
          >{(estimatedRatePerMilliSecond * 1000).toFixed(1)}/s</td
        ></tr
      >
      <tr
        transition:fade={{ delay: 2000, duration: 1500 }}
        title="Estimated when new satellite launched"
        ><th>Estimated time to reach 100% at current rate:</th><td
          >{Math.floor(
            (2 ** 50 - swarm.count) /
              estimatedRatePerMilliSecond /
              (365 * 24 * 3600 * 1000)
          )} years</td
        ></tr
      >
    </table>
  {/if}
</div>

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

  table {
    margin-left: -100%;
  }
  th {
    min-width: 10rem;
    border-bottom: 1px solid black;
  }
  tr:last-child th {
    border: none;
  }
</style>
