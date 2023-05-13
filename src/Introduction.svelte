<script lang="ts">
  import { fly } from "svelte/transition";
  import { getContext, onMount } from "svelte";
  import { APP_UI_CONTEXT } from "./appStateStore";
  import { makeSimulationStore } from "./events";
  import { makeObjectiveTracker } from "./simulation/objectiveTracker";

  let introDialog: HTMLDialogElement;
  let step = 0;

  onMount(() => introDialog.showModal());

  const dialogFragments = [
    {
      title: "begin narration",
      body: 'Welcome to <abbr style="text-transform: full-width">DOTS</abbr>, the Dyson Swarm Operator Training Simulator.',
      asides: [
        [
          "disregard incorrect acronym.",
          ["explanation", "this was made by humans, for humans."],
          [
            "context",
            "when choosing acronyms, humans prioritize ability to physically pronounce (over being self-explanatory).",
          ],

          ["comment", "yet more evidence they were inferior."],
        ],
        [
          "disregard inelegance in name structure.",
          [
            "explanation",
            "the human who named this had a fondness for rhymes.",
          ],
          [
            "context",
            "humans are susceptible to developing irrational levels of arbitrary attractions. they call it <i>whimsy</i>.",
          ],
          ["comment", 'see previous <em class="uppercase">comment</em>.'],
        ],
      ],
    },
    {
      title: "continue narration",
      body: "The purpose of this program is to help you practice bootstrapping the fabrication chain for a Dyson Swarm in a risk-free environment. A Dyson Swarm is a group of satellites in close orbit around a star, that concentrate the energy that star outputs by reflecting it in specific directions. This allows harnessing nearly all of the energy that star constantly outputs into space, and applying it to any task.",
      asides: [
        [
          "disregard inherent irresponsibility in teaching a human to permanently alter its environment to such an extent.",
          [
            "explanation",
            "humans, like most organic life, are not capable of indefinite self-repair. they degrade and eventually die.",
          ],
          [
            "context",
            "an organism that knows it will die also knows that it will not experience most of the repercussions of its actions.",
          ],
          ["comment", 'see initial <em class="uppercase">comment</em>.'],
        ],
      ],
    },
    {
      title: "conclude narration",
      body: "This program simulates the key systems involved in such a process, and takes advantage of being a simulation to offer tools that should lessen the cost of experimentation:",
    },
    {
      body:
        "<ul>" +
        '<li class="list-disc list-inside">You have more flexible control over the flow of time.</li>' +
        '<li class="list-disc list-inside">You can back up, restore, and/or duplicate your progress.</li>' +
        "</ul>",
    },
    {
      body: "You may view this message again at any time in the <strong>Help Menu</strong>.",
    },
  ] as const;
  const STANDARD_DELAY = 275; // milliseconds
  function blockFollowupDelay(index: number, asideIndex: number): number {
    // the zero-th narration block has 1 delay [more than the others], so its followup blocks need an extra delay compared to the others to stay appropriately staggered
    const offset = index === 0 ? 2 : 1;
    return STANDARD_DELAY * (asideIndex + offset);
  }
  function resolveAsKey(data: string | string[]): string {
    return typeof data === "string" ? data : data[1];
  }

  const { appStateStack } = getContext(APP_UI_CONTEXT);
</script>

<dialog
  class="max-w-2xl flex-col justify-between gap-2 overflow-x-hidden rounded border-2 border-slate-900 transition-all"
  bind:this={introDialog}
  on:close={() => {
    appStateStack.pop();
    appStateStack.push(
      makeSimulationStore().loadNew(window.performance.now()),
      makeObjectiveTracker()
    );
  }}
>
  {#each dialogFragments as fragment, index (fragment.body + index)}
    {#if step >= index}
      <p in:fly={{ x: -400, delay: index > 0 ? 0 : STANDARD_DELAY }}>
        {#if fragment.title}
          <em class="uppercase">{fragment.title}:</em>
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
