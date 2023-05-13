<script lang="ts">
  import type { Objective } from "./objectiveTracker";

  type Position = [number, ...number[]];
  export let data: { objective: Objective; position: Position };
  export let progress: Set<ReturnType<typeof JSON.stringify>>;

  $: serializedPosition = JSON.stringify(data.position);
</script>

{#if data?.objective && data.objective?.details === undefined}
  <details class="ml-2">
    <summary class="cursor-pointer rounded border-2 border-slate-800 p-2"
      >{data.objective.title}</summary
    >
    <ol class="flex flex-col flex-nowrap justify-around gap-1 pt-1">
      {#each data.objective.subObjectives as subObjective, index}
        <li>
          <svelte:self
            data={{
              objective: subObjective,
              position: [...data.position, index],
            }}
            {progress}
          />
        </li>
      {/each}
    </ol>
  </details>
{:else if data?.objective}
  <a
    href="#"
    on:click|preventDefault
    class="ml-2 flex flex-row flex-nowrap justify-items-start gap-2 rounded border-2 border-slate-800 p-2"
    id="guide-nav-to-{serializedPosition}"
  >
    <!--    class:done={progress.has(JSON.stringify(data.position))}-->
    <input
      type="checkbox"
      disabled
      checked={progress.has(serializedPosition)}
      aria-labelledby="guide-nav-to-{serializedPosition}"
    />
    {data.objective.title}</a
  >
{/if}
