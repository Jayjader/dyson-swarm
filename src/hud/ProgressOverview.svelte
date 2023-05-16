<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import {
    getNestedItem,
    OBJECTIVE_TRACKER_CONTEXT,
  } from "../objectiveTracker/store";

  const { objectives } = getContext(OBJECTIVE_TRACKER_CONTEXT);
  let activeObjective, currentStep, progress;
  const trackerSub = objectives.subscribe((tracker) => {
    if (tracker.active.length === 0) {
      activeObjective = undefined;
      currentStep = undefined;
      progress = undefined;
    } else {
      activeObjective = getNestedItem(objectives.objectives, tracker.active);
      currentStep = activeObjective.steps.find(
        (_, index) =>
          !tracker.progress.has(JSON.stringify([...tracker.active, index]))
      );
      progress = tracker.progress;
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
    <td class="max-w-max align-text-top"
      >{#if activeObjective}{#if currentStep}{@html currentStep[0]}{:else}(Objective
          Completed){/if}{:else}(None){/if}</td
    >
  </tr>
</table>
