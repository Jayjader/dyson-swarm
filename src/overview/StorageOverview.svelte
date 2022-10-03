<script lang="ts">
  import Storage from "./Storage.svelte";

  const watt = "W";
  const wattTick = `${watt}t`;
  const kilogram = "kg";
</script>

<section class="flex flex-col gap-1 p-1 border-2 rounded border-slate-100">
  <h3 class="text-slate-100 font-bold text-center">Storage</h3>
  <Storage
    name="Power"
    icon="/electric.svg"
    unit={wattTick}
    stored={150}
    produced={30}
    consumed={24}
  />
  <Storage
    name="Ore"
    icon="/ore.svg"
    unit={kilogram}
    stored={150}
    produced={13}
    consumed={12}
  />
  <Storage
    name="Metal"
    icon="/metal-bar.svg"
    unit={kilogram}
    stored={5}
    produced={2}
    consumed={5}
  />
  <Storage
    name="Satellites"
    icon="/cardboard-box.svg"
    stored={1}
    produced={0}
    consumed={0}
  />
</section>
