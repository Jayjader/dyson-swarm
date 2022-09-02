<!-- @component Recap of overall resource state -->
<script lang="ts">
  import type { Resource } from "./types";
  export let resources: [Resource, number][];

  const resourceNames: Record<Resource, string> = {
    elec: "Electricity",
    metal: "Refined Metal",
    ore: "Raw metallic ore",
    pkg_sat: "Packaged satellites",
  };
</script>

<ul>
  {#each resources as [resource, amount] (resource)}
    <li title={resourceNames[resource]} data-icon={resource}>{amount}</li>
  {/each}
</ul>

<style>
  ul {
    grid-area: resources;
    list-style-position: inside;
    list-style-type: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-flow: row wrap;
    align-content: flex-start;
  }

  ul li {
    display: list-item;
    flex: 0 0 max-content;
  }
  ul li:nth-child(n-4) {
    padding-right: 1ch;
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
    font-size: 2em;
  }
</style>
