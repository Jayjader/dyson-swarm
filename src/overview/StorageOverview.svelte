<script lang="ts">
  import Storage from "./Storage.svelte";

  const watt = "W";
  const wattTick = `${watt}t`;
  const kilogram = "kg";
</script>

<section class="flex flex-col gap-1 rounded border-2 border-slate-100 p-1">
  <h2 class="text-center font-bold text-slate-100">Storage</h2>
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
