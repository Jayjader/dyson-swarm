<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import {
    OBJECTIVE_TRACKER_CONTEXT,
    type TrackedObjectives,
  } from "../objectiveTracker/store";
  import { getNestedItem } from "../objectiveTracker/objectives";

  const { objectives } = getContext(OBJECTIVE_TRACKER_CONTEXT);
  let activeObjective, currentStep;
  const trackerSub = objectives.subscribe((tracker: TrackedObjectives) => {
    if (tracker.active.length === 0) {
      activeObjective = undefined;
      currentStep = undefined;
    } else {
      activeObjective = getNestedItem(objectives.objectives, tracker.active);
      currentStep = activeObjective.steps.find(
        (_, index) =>
          !tracker.completed.has(JSON.stringify([...tracker.active, index]))
      );
    }
  });
  onDestroy(trackerSub);
</script>

<table
  class="flex border-collapse flex-col flex-nowrap gap-1 rounded border-2 border-slate-100 p-1 text-slate-100"
>
  <tr class="flex flex-row flex-nowrap gap-2">
    <th class="pr-2 text-left align-text-top"
      ><span class="rounded-br border-b-2 border-b-stone-600 pb-1"
        >Objective:</span
      ></th
    >
    <td class="max-w-max align-text-top"
      >{#if activeObjective}{activeObjective.title}{:else}(None){/if}</td
    >
  </tr>
  <tr class="flex flex-row flex-nowrap gap-2">
    <th class="pr-2 text-left align-text-top"
      ><span class="rounded-br border-b-2 border-b-stone-600 pb-1"
        >Current Step:</span
      ></th
    >
    <td class="max-w-max align-text-top">
      {#if !activeObjective}
        (None)
      {:else if currentStep}
        {@html currentStep[0]}
      {:else}
        Objective Complete (open guide to choose next active objective)
      {/if}
    </td>
  </tr>
</table>
