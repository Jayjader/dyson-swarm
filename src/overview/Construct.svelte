<script lang="ts">
  export let name: string = "unknown";
  export let consumes = [
    {
      name: "unknown",
      value: 0,
      unit: "unit",
      icon: "https://via.placeholder.com/28.png",
    },
  ];
  export let produces = {
    name: "unknown",
    value: 0,
    unit: "unit",
    icon: "https://via.placeholder.com/28.png",
  };
  export let basis: "full" | "2/5" | "3/5" = "full";
</script>

<div
  class="basis-{basis} p-1 gap-1 flex flex-row border-2 rounded border-zinc-300 bg-slate-500 text-zinc-50"
>
  <img
    class="self-center max-w-min aspect-square mr-1"
    src="/{name}.png"
    alt={name}
    title={name}
  />
  <div class="flex-1 flex flex-row flex-wrap justify-between gap-1">
    <div class="flex flex-col gap-1 justify-between">
      <h4 class="font-bold text-zinc-50">{name}</h4>
      <slot />
    </div>
    <div class="flex flex-col gap-1 justify-between">
      <div class="flex flex-col">
        <h5 class="font-bold">Consumes:</h5>
        <span class="flex flex-row gap-1">
          {#each consumes as c (c.name)}
            <img
              class="ml-2 mr-1 self-center max-w-min h-4 aspect-square"
              src={c.icon}
              alt={c.name}
              title={c.name}
            />
            <output>{c.value} {@html c.unit}</output>
          {/each}
        </span>
      </div>
      <div class="flex flex-col">
        <h5 class="font-bold">Produces:</h5>
        <span class="flex flex-row gap-1">
          <img
            class="ml-2 mr-1 self-center max-w-min h-4 aspect-square"
            src={produces.icon}
            alt={produces.name}
            title={produces.name}
          />
          <output>{produces.value} {@html produces.unit}</output>
        </span>
      </div>
    </div>
  </div>
</div>
