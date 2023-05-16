<script lang="ts">
  import type { Objective } from "./store";
  import {
    debugProgress,
    getNestedItem,
    getNextObjective,
    getPositionOfFirstItem,
    OBJECTIVE_TRACKER_CONTEXT,
  } from "./store";
  import { getContext, onDestroy } from "svelte";
  import ObjectiveNavItem from "./ObjectiveNavItem.svelte";

  let dialogElement: HTMLDialogElement;

  type Position = [number, ...number[]];
  const trackerState = {
    objectives: [],
    tracking: {
      open: false,
      progress: new Set(),
      active: [],
    },
    viewing: undefined as
      | { objective: Objective; position: Position }
      | undefined,
  };

  const store = getContext(OBJECTIVE_TRACKER_CONTEXT).objectives;
  trackerState.objectives = store.objectives;
  const storeSub = store.subscribe(({ open, active, progress }) => {
    if (open && !trackerState.tracking.open) {
      dialogElement.show();
    }
    trackerState.tracking = { open, active, progress };

    debugProgress(progress, trackerState.objectives);
    if (trackerState.objectives.length === 0) {
      trackerState.viewing = undefined;
    } else {
      let position;
      if (trackerState.tracking.active.length === 0) {
        position = getPositionOfFirstItem(trackerState.objectives);
      } else {
        position = trackerState.tracking.active;
      }
      trackerState.viewing = {
        objective: getNestedItem(trackerState.objectives, position),
        position,
      };
    }
  });
  onDestroy(storeSub);

  function setViewing(position) {
    trackerState.viewing = {
      objective: getNestedItem(trackerState.objectives, position),
      position,
    };
  }
</script>

<dialog
  bind:this={dialogElement}
  on:close={store.close}
  class="flex-row flex-wrap items-stretch gap-1 border-4 border-slate-900 bg-slate-900 p-0"
>
  <div
    class="row-span-2 flex flex-grow flex-col flex-nowrap gap-4 bg-slate-300 p-4"
  >
    <div class="flex flex-row flex-nowrap justify-between gap-4">
      <h2>
        Objective: {#if trackerState.viewing}
          {trackerState.viewing.objective.title}
        {/if}
      </h2>
      <button
        disabled={trackerState.viewing.position.every(
          (x, i) => trackerState.tracking.active[i] === x
        )}
        on:click={() => store.setActive(trackerState.viewing.position)}
        class="rounded border-2 border-slate-900 p-4"
        >{#if trackerState.viewing.position.every((x, i) => trackerState.tracking.active[i] === x)}Currently{:else}Set
          As{/if} Active</button
      >
    </div>
    <div class="flex flex-row flex-wrap gap-4">
      <h3>Details:</h3>
      {#if trackerState.viewing}
        <div class="flex flex-shrink flex-col flex-nowrap">
          {#each trackerState.viewing.objective.details as detail}
            <p class="max-w-lg">
              {@html detail}
            </p>
          {/each}
        </div>
      {/if}
    </div>
    <div class="flex flex-row flex-wrap gap-4">
      <h3>Steps:</h3>
      <ol class="flex flex-col flex-nowrap">
        {#if trackerState.viewing}{#each trackerState.viewing.objective.steps as [step], index}<li
              class="flex flex-row flex-nowrap gap-1"
            >
              <input
                type="checkbox"
                disabled
                id="guide-objective-step-progress-{index}"
                checked={trackerState.tracking.progress.has(
                  JSON.stringify([...trackerState.viewing.position, index])
                )}
                class="mt-1 self-start"
              />
              <label for="guide-objective-step-progress-{index}">
                {@html step}
              </label>
            </li>{/each}{/if}
      </ol>
    </div>
    {#if trackerState.viewing && trackerState.tracking.progress.has(JSON.stringify(trackerState.viewing.position))}
      <button
        on:click={() =>
          store.setActive(
            getNextObjective(
              trackerState.objectives,
              trackerState.viewing.position
            )[1]
          )}
        class="self-center rounded border-2 border-slate-900 p-2">Next</button
      >
    {/if}
  </div>
  <div class="flex flex-grow flex-col flex-nowrap items-stretch gap-1">
    <nav
      aria-labelledby="Objectives-title"
      class="grid max-w-full grid-cols-2 gap-2 bg-slate-300 p-4"
    >
      <h2 id="Objectives-title" class="col-span-2 scroll-m-0">Objectives</h2>
      <!--      <div class="mx-auto flex flex-row flex-nowrap justify-center gap-4">-->
      <button
        class="rounded border-2 border-slate-800 p-4"
        disabled={trackerState.tracking.active.length === 0}
        on:click={() =>
          (trackerState.viewing = {
            position: trackerState.tracking.active,
            objective: getNestedItem(
              trackerState.objectives,
              trackerState.tracking.active
            ),
          })}>View Active</button
      >
      <button
        class="rounded border-2 border-slate-800 p-4"
        disabled={trackerState.tracking.active.length === 0}
        on:click={() => store.setActive([])}>Clear Active</button
      >
      <!--      </div>-->
      <input type="text" placeholder="Search..." class="col-span-2 m-2 p-2" />
      <!--      <div class="mx-auto flex flex-row flex-nowrap justify-center gap-4">-->
      <button class="rounded border-2 border-slate-800 p-4">Collapse All</button
      >
      <button class="rounded border-2 border-slate-800 p-4">Expand All</button>
      <!--      </div>-->
      <hr
        class="col-span-2 rounded border-t-2 border-b-2 border-slate-900 text-slate-900"
      />
      <ol
        class="p-l-1 col-span-2 flex flex-col flex-nowrap gap-2.5 overflow-y-scroll"
      >
        {#each trackerState.objectives as objective, index}<li class="-ml-2">
            <ObjectiveNavItem
              data={{ objective, position: [index] }}
              progress={trackerState.tracking.progress}
              action={setViewing}
              active={trackerState.tracking.active}
            />
          </li>{/each}
      </ol>
    </nav>
    <button
      type="button"
      on:click={() => dialogElement.close()}
      class="bg-slate-300 p-4">Close</button
    >
  </div>
</dialog>

<style>
  dialog[open] {
    display: flex;
  }
</style>
