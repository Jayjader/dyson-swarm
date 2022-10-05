<script lang="ts">
  export let name: string;
  export let icon: string;
  export let unit: string = "";
  export let stored: number;
  export let produced: number = 0;
  export let consumed: number = 0;
  $: total = produced - consumed;
</script>

<div
  class="flex flex-row flex-wrap gap-1 p-1 border-4 rounded border-slate-500 bg-zinc-200 text-slate-700"
>
  <img
    class="max-h-12 aspect-square self-center px-1 ml-auto mr-auto"
    alt={name}
    src={icon}
  />
  <div class="flex-grow flex flex-row flex-wrap">
    <div class="flex flex-col items-start">
      <h4
        class="flex-grow font-bold border-b-2 border-b-slate-500 rounded-br pr-1"
        style="line-height: 1;"
      >
        {name}
      </h4>
      <h5 class="font-bold">Stored</h5>
      <output>{stored}{unit}</output>
    </div>
    <div class="flex-grow flex flex-col">
      <h5 class="text-center font-bold" style="line-height: 1;">Last Tick</h5>
      <div class="flex flex-row gap-1">
        <div class="basis-1/2 flex flex-col items-end">
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
