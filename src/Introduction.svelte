<script lang="ts">
  import { fly } from "svelte/transition";
  import { getContext, onMount } from "svelte";
  import { OBJECTIVE_TRACKER_CONTEXT } from "./objectiveTracker/store";
  import type { Aside } from "./objectiveTracker/objectives";

  let introDialog: HTMLDialogElement;
  let step = 0;

  onMount(() => introDialog.showModal());

  const { objectives } = getContext(OBJECTIVE_TRACKER_CONTEXT);
  const dialogFragments: { body: string; asides?: Aside[] }[] =
    objectives.objectives[0].details.map((fragment) => {
      if (Array.isArray(fragment)) {
        const [body, asides] = fragment;
        return {
          body,
          asides,
        };
      }
      return { body: fragment };
    });

  const STANDARD_DELAY = 275; // milliseconds
  function blockFollowupDelay(index: number, asideIndex: number): number {
    // the zero-th narration block has 1 delay [more than the others], so its followup blocks need an extra delay compared to the others to stay appropriately staggered
    const offset = index === 0 ? 2 : 1;
    return STANDARD_DELAY * (asideIndex + offset);
  }
  function resolveAsKey(data: string | string[]): string {
    return typeof data === "string" ? data : data[1];
  }
</script>

<!-- todo: only complete if confirm'd -->
<dialog
  class="max-w-2xl flex-col justify-between gap-2 overflow-x-hidden rounded border-2 border-slate-900 transition-all"
  bind:this={introDialog}
>
  {#each dialogFragments as fragment, index (fragment.body + index)}
    {#if step >= index}
      <p in:fly={{ x: -400, delay: index > 0 ? 0 : STANDARD_DELAY }}>
        {#if index < dialogFragments.length - 2}
          <em class="uppercase">
            {#if index === 0}begin{:else if index === dialogFragments.length - 2}conclude{:else}continue{/if}
            narration:
          </em>
        {/if}
        {@html fragment.body}
      </p>
      {#if fragment.asides}
        <ul class="flex flex-row">
          {#each fragment.asides as aside, asideIndex (resolveAsKey(aside) + asideIndex)}
            <li
              class="shrink-0 grow basis-1/2"
              in:fly={{ x: 100, delay: blockFollowupDelay(index, asideIndex) }}
            >
              <details class="ml-2 rounded-2xl bg-slate-200 p-3">
                <summary class="cursor-pointer uppercase">aside</summary>
                <aside class="flex flex-col justify-between gap-2">
                  {#each aside as segment, segmentIndex (resolveAsKey(segment) + segmentIndex)}
                    <p>
                      {#if typeof segment === "string"}
                        {@html segment}
                      {:else}
                        <em class="uppercase">{segment[0]}:</em>
                        {@html segment[1]}
                      {/if}
                    </p>
                  {/each}
                </aside>
              </details>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  {/each}

  <form method="dialog" class="flex flex-row flex-nowrap justify-center">
    {#if step === dialogFragments.length - 1}
      <button type="submit" class="rounded border-2 border-slate-500 p-2">
        Begin!
      </button>
    {:else}
      <button
        type="button"
        class="rounded border-2 border-slate-500 p-2"
        on:click={() => step++}
      >
        Next
      </button>
    {/if}
  </form>
</dialog>

<style>
  dialog {
    min-height: 8rem;
  }
  /* the attribute selector is needed to prevent the browser from overriding
  the default behavior [to hide a closed <dialog>] */
  dialog[open] {
    display: flex;
  }
  details[open] > summary::after {
    content: ":";
  }
</style>
