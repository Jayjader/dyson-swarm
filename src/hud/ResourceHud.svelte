<!-- @component Recap of overall resource state -->
<script lang="ts">
  import { Resource } from "../gameRules";

  export let resources: Map<Resource, bigint> = new Map();

  type URL = string;
  type Name = string;
  const resourceInfo: Map<Resource, [Name, URL]> = new Map([
    [Resource.ELECTRICITY, ["Electricity", "/electric.svg"]],
    [Resource.METAL, ["Refined Metal", "/metal-bar.svg"]],
    [Resource.ORE, ["Raw metallic ore", "/ore.svg"]],
    [
      Resource.PACKAGED_SATELLITE,
      ["Packaged satellites", "/cardboard-box-closed.svg"],
    ],
  ]);
</script>

<div class="flex flex-row gap-1">
  {#each [...resources] as [resource, amount] (resource)}
    <div class="flex flex-row flex-wrap justify-around items-center gap-1">
      <img
        style="height: clamp(1ch, 4vh, 2rem)"
        src={resourceInfo.get(resource)[1]}
        title={resourceInfo.get(resource)[0]}
        alt={resourceInfo.get(resource)[0]}
      />
      <output>{amount > 9999 ? Number(amount).toExponential(1) : amount}</output>
    </div>
  {/each}
</div>
