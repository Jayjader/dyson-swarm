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
</script>

<div
  class="basis-full p-1 gap-1 flex flex-row border-2 rounded border-zinc-300 text-zinc-300"
>
  <img
    class="self-center max-w-min aspect-square mr-1"
    src="/{name}.png"
    alt={name}
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
          {#each consumes as { name, value, unit, icon } (name)}
            <img
              class="self-center max-w-min h-4 aspect-square"
              src={icon}
              alt={name}
            />
            <output>{value} {@html unit}</output>
          {/each}
        </span>
      </div>
      <div class="flex flex-col">
        <h5 class="font-bold">Produces:</h5>
        <span class="flex flex-row gap-1">
          <img
            class="self-center max-w-min h-4 aspect-square"
            src={produces.icon}
            alt={produces.name}
          />
          <output>{produces.value} {@html produces.unit}</output>
        </span>
      </div>
    </div>
  </div>
</div>
