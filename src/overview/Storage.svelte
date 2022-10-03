<script lang="ts">
  export let name: string;
  export let icon: string;
  export let unit: string = "";
  export let stored: number;
  export let produced: number;
  export let consumed: number;
  $: total = (produced ?? 0) - (consumed ?? 0);
</script>

<div
  class="flex flex-row gap-1 border-4 rounded border-slate-500 bg-zinc-200 text-slate-700"
>
  <img class="max-h-12 aspect-square self-center mr-1" alt={name} src={icon} />
  <div class="flex-grow flex flex-row">
    <div class="flex-grow flex flex-col">
      <h4 class="font-bold">{name}</h4>
      <h5 class="font-bold">Stored</h5>
      <output>{stored}{unit}</output>
    </div>
    <div class="flex-grow flex flex-col">
      <h5 class="text-center font-bold">Last Tick</h5>
      <div class="flex flex-row justify-around gap-1">
        <div class="basis-1/2 flex flex-col">
          <h5 class="font-bold">Total</h5>
          <output>{total > 0 ? "+" : ""}{total}{unit}</output>
        </div>
        <div class="basis-1/2 flex flex-col">
          <span class="flex flex-row gap-1">
            <output>{produced}{unit}</output><span>Produced</span>
          </span>
          <span class="flex flex-row gap-1">
            <output>{consumed}{unit}</output><span>Consumed</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</div>
