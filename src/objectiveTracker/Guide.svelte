<script lang="ts">
  import { debugProgress, OBJECTIVE_TRACKER_CONTEXT } from "./store";
  import { getContext, onDestroy } from "svelte";
  import ObjectiveNavItem from "./ObjectiveNavItem.svelte";
  import CommonGuideButton from "./CommonGuideButton.svelte";
  import {
    areEqual,
    getNestedItem,
    getNextObjective,
    getPositionOfFirstItem,
    hasSubObjectives,
    type Objective,
    walkObjectivePositions,
  } from "./objectives";

  let dialogElement: HTMLDialogElement;

  type Position = [number, ...number[]];
  const trackerState = {
    objectives: [],
    tracking: {
      open: false,
      completed: new Set(),
      started: new Set(),
      active: [],
    },
    viewing: undefined as
      | { objective: Objective; position: Position; next?: Position }
      | undefined,
  };

  const store = getContext(OBJECTIVE_TRACKER_CONTEXT).objectives;
  trackerState.objectives = store.objectives;
  const storeSub = store.subscribe(({ open, active, completed, started }) => {
    if (open && !trackerState.tracking.open) {
      dialogElement.show();
    }
    trackerState.tracking = { open, active, completed, started };

    debugProgress(started, completed, trackerState.objectives);
    if (trackerState.objectives.length === 0) {
      trackerState.viewing = undefined;
    } else {
      let position;
      if (trackerState.tracking.active.length === 0) {
        position = getPositionOfFirstItem(trackerState.objectives);
      } else {
        position = trackerState.tracking.active;
      }
      const next = getNextObjective(trackerState.objectives, position);
      console.debug({ nextObjective: next });
      trackerState.viewing = {
        objective: getNestedItem(trackerState.objectives, position),
        position,
        next: next?.[1],
      };
    }
  });
  onDestroy(storeSub);

  function setViewing(position) {
    trackerState.viewing = {
      objective: getNestedItem(trackerState.objectives, position),
      position,
      next: getNextObjective(trackerState.objectives, position)?.[1],
    };
  }

  $: showNextButton =
    trackerState.viewing?.next &&
    ((!hasSubObjectives(trackerState.viewing.objective) &&
      trackerState.viewing.objective.steps?.length === 0) ||
      trackerState.tracking.completed.has(
        JSON.stringify(trackerState.viewing.position)
      ));
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
      <h2 style="font-size: clamp(1rem, 4ch, 2.75rem)">
        Objective: {#if trackerState.viewing}
          {trackerState.viewing.objective.title}
        {/if}
      </h2>
      <CommonGuideButton
        disabled={areEqual(
          trackerState.tracking.active,
          trackerState.viewing.position
        )}
        on:click={() => store.setActive(trackerState.viewing.position)}
      >
        {#if areEqual(trackerState.tracking.active, trackerState.viewing.position)}
          Currently
        {:else}
          Set As
        {/if} Active
      </CommonGuideButton>
    </div>
    <div class="flex flex-row flex-wrap gap-4">
      <h3>Details:</h3>
      {#if trackerState.viewing}
        <div class="flex flex-shrink flex-col flex-nowrap">
          {#each trackerState.viewing.objective.details as detail}
            <p class="max-w-lg">
              {@html Array.isArray(detail) ? detail[0] : detail}
            </p>
          {/each}
        </div>
      {/if}
    </div>
    {#if trackerState.viewing && trackerState.viewing.objective.steps?.length > 0}
      <div class="flex flex-row flex-wrap gap-4">
        <h3>Steps:</h3>
        <ol class="flex flex-col flex-nowrap">
          {#each trackerState.viewing.objective.steps as [step], index}<li
              class="flex flex-row flex-nowrap gap-1"
            >
              <input
                type="checkbox"
                disabled
                id="guide-objective-step-completed-{index}"
                checked={trackerState.tracking.completed.has(
                  JSON.stringify([...trackerState.viewing.position, index])
                )}
                class="mt-1 self-start"
              />
              <label for="guide-objective-step-completed-{index}">
                {@html step}
              </label>
            </li>{/each}
        </ol>
      </div>
    {/if}
    {#if showNextButton}
      <CommonGuideButton
        on:click={() => store.setActive(trackerState.viewing.next)}
        >Next</CommonGuideButton
      >
    {/if}
  </div>
  <div
    class="flex flex-grow flex-col flex-nowrap items-stretch justify-between gap-1"
  >
    <nav
      aria-labelledby="Objectives-title"
      class="grid max-w-full flex-grow grid-cols-2 gap-2 bg-slate-300 p-4"
    >
      <h2 id="Objectives-title" class="col-span-2 scroll-m-0">Objectives</h2>
      <CommonGuideButton
        disabled={trackerState.tracking.active.length === 0}
        on:click={() => (
          (trackerState.viewing = {
            position: trackerState.tracking.active,
            objective: getNestedItem(
              trackerState.objectives,
              trackerState.tracking.active
            ),
            next: getNextObjective(
              trackerState.objectives,
              trackerState.tracking.active
            ),
          }),
          trackerState.tracking.active.forEach((_, i) =>
            dialogElement
              .querySelectorAll(
                `[data-position="${JSON.stringify(
                  trackerState.tracking.active.slice(0, i + 1)
                )}"]`
              )
              .forEach((details) => !details.open && (details.open = true))
          )
        )}>View Active</CommonGuideButton
      >
      <CommonGuideButton
        disabled={trackerState.tracking.active.length === 0}
        on:click={() => store.setActive([])}>Clear Active</CommonGuideButton
      >
      <input type="text" placeholder="Search..." class="col-span-2 m-2 p-2" />
      <CommonGuideButton
        class="rounded border-2 border-slate-800 p-4"
        on:click={() =>
          walkObjectivePositions(trackerState.objectives).forEach((position) =>
            dialogElement
              .querySelectorAll(`[data-position="${JSON.stringify(position)}"]`)
              .forEach((details) => details.open && (details.open = false))
          )}>Collapse All</CommonGuideButton
      >
      <CommonGuideButton
        class="rounded border-2 border-slate-800 p-4"
        on:click={() =>
          walkObjectivePositions(trackerState.objectives).forEach((position) =>
            dialogElement
              .querySelectorAll(`[data-position="${JSON.stringify(position)}"]`)
              .forEach((details) => !details.open && (details.open = true))
          )}>Expand All</CommonGuideButton
      >
      <hr
        class="col-span-2 rounded border-t-2 border-b-2 border-slate-900 text-slate-900"
      />
      <ol
        class="p-l-1 col-span-2 flex flex-col flex-nowrap gap-2.5 overflow-y-scroll"
      >
        {#each trackerState.objectives as objective, index (`${objective.title}-${index}`)}
          {#if trackerState.tracking.started.has(JSON.stringify([index]))}
            <li class="-ml-2">
              <ObjectiveNavItem
                data={{ objective, position: [index] }}
                completed={trackerState.tracking.completed}
                started={trackerState.tracking.started}
                action={setViewing}
                active={trackerState.tracking.active}
              />
            </li>
          {/if}
        {/each}
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
