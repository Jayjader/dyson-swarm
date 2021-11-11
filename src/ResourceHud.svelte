<!-- @component Recap of overall resource state -->
<script lang="ts">
  import type { Resource } from "./types";
  export let resources: [Resource, number][];
</script>

<ul>
  {#each resources as [resource, amount] (resource)}
    <li title={resource} data-icon={resource}>{amount}</li>
  {/each}
</ul>

<style>
  ul {
    grid-area: resources;
    list-style-position: outside;
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  ul li {
    display: inline list-item;
    max-width: 1em;
  }
  li[data-icon="ore"] {
    list-style-image: url("/ore.svg");
  }

  li[data-icon="elec"] {
    list-style-image: url("/electric.svg");
  }

  li[data-icon="metal"] {
    list-style-image: url("/metal-bar.svg");
  }

  li[data-icon="pkg_sat"] {
    list-style-image: url("/cardboard-box-closed.svg");
  }

  ul li::marker {
    font-size: clamp(1em, calc(100vw / 16), 6em);
  }
</style>
