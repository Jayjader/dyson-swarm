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
  class="flex flex-row flex-wrap gap-1 rounded border-4 border-slate-500 bg-zinc-200 p-1 text-slate-700"
>
  <img
    class="ml-auto mr-auto aspect-square max-h-12 self-center px-1"
    alt={name}
    src={icon}
  />
  <div class="flex flex-grow flex-row flex-wrap">
    <div class="flex flex-col items-start">
      <h4
        class="flex-grow rounded-br border-b-2 border-b-slate-500 pr-1 font-bold"
        style="line-height: 1;"
      >
        {name}
      </h4>
      <h5 class="font-bold">Stored</h5>
      <output>{stored}{unit}</output>
    </div>
    <div class="flex flex-grow flex-col">
      <h5 class="text-center font-bold" style="line-height: 1;">Last Tick</h5>
      <div class="flex flex-row gap-1">
        <div class="flex basis-1/2 flex-col items-end">
          <h5 class="font-bold">Total</h5>
          <output>{total > 0 ? "+" : ""}{total}{unit}</output>
        </div>
        <div class="flex basis-1/2 flex-col">
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
