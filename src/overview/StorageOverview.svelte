<script lang="ts">
  import Storage from "./Storage.svelte";
  import { Resource } from "../gameStateStore";

  const watt = "W";
  const wattTick = `${watt}t`;
  const kilogram = "kg";

  export let resources = new Map();
</script>

<section class="flex flex-col gap-1 rounded border-2 border-slate-100 p-1">
  <h2 class="text-center font-bold text-slate-100">Storage</h2>
  <Storage
    name="Power"
    icon="/electric.svg"
    unit={wattTick}
    stored={resources.get(Resource.ELECTRICITY)}
    produced={30}
    consumed={24}
  />
  <Storage
    name="Ore"
    icon="/ore.svg"
    unit={kilogram}
    stored={resources.get(Resource.ORE)}
    produced={13}
    consumed={12}
  />
  <Storage
    name="Metal"
    icon="/metal-bar.svg"
    unit={kilogram}
    stored={resources.get(Resource.METAL)}
    produced={2}
    consumed={5}
  />
  <Storage
    name="Satellites"
    icon="/cardboard-box.svg"
    stored={resources.get(Resource.PACKAGED_SATELLITE)}
    produced={0}
    consumed={0}
  />
</section>
