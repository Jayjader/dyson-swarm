<script lang="ts">
  import type { Objective } from "./store";

  type Position = [number, ...number[]];
  export let data: { objective: Objective; position: Position };
  export let progress: Set<ReturnType<typeof JSON.stringify>>;
  export let action: (p: Position) => void;
  export let active: Position;

  $: serializedPosition = JSON.stringify(data.position);
  $: isActive =
    data.position.length === active.length &&
    data.position.every((x, i) => x === active[i]);
</script>

{#if data?.objective && data.objective?.details === undefined}
  <details class="ml-2">
    <summary class="cursor-pointer rounded border-2 border-slate-800 p-2"
      >{data.objective.title}</summary
    >
    <ol class="flex flex-col flex-nowrap justify-around gap-1 pt-1">
      {#each data.objective.subObjectives as subObjective, index}
        <li class="contents">
          <svelte:self
            data={{
              objective: subObjective,
              position: [...data.position, index],
            }}
            {progress}
            {action}
            {active}
          />
        </li>
      {/each}
    </ol>
  </details>
{:else if data?.objective}
  <button
    type="button"
    on:click={() => action(data.position)}
    class="ml-2 flex flex-row flex-nowrap justify-items-start gap-2 rounded border-2 border-slate-800  p-2"
    class:bg-orange-400={isActive}
    id="guide-nav-to-{serializedPosition}"
  >
    <input
      type="checkbox"
      name="{data.objective.title} completion"
      disabled
      checked={progress.has(serializedPosition)}
      aria-labelledby="guide-nav-to-{serializedPosition}"
    />
    {data.objective.title}
    {#if isActive}
      <span class="text-slate-600">(Active)</span>
    {/if}
  </button>
{/if}
