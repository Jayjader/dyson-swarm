<script lang="ts">
  import { fly } from "svelte/transition";
  import { onMount } from "svelte";
  let showTutorial = true;
  let tutorialDialogue: HTMLDialogElement;
  let step = 0;

  onMount(() => showTutorial && tutorialDialogue.showModal());

  const dialogFragments = [
    [
      "begin narration",
      "Welcome to <abbr>DOTS</abbr>, the Dyson Swarm Operator Training Simulator.",
      [
        [
          [undefined, "disregard incorrect acronym."],
          ["explanation", "this was made by humans, for humans."],
          [
            "context",
            "when choosing acronyms, humans prioritize ability to physically pronounce (over being self-explanatory).",
          ],

          ["comment", "yet more evidence they were inferior."],
        ],
        [
          [undefined, "disregard inelegance in name structure."],
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
    ],
    [
      "continue narration",
      "The purpose of this program is to help you practice bootstrapping the fabrication chain for a Dyson Swarm in a risk-free environment. A Dyson Swarm is a group of satellites in close orbit around a star, that concentrate that star's output of energy by reflecting it in specific directions. This allows harnessing nearly all of the energy that star constantly outputs into space, and applying it to any task.",
      [
        [
          [
            undefined,
            "disregard inherent irresponsibility in teaching a human to permanently alter its environment to such an extent.",
          ],
          [
            "explanation",
            "humans, like most organic life, are not capable of indefinite self-repair. they degrade and eventually die. they only continue to exist because of constant population renewal through procreation.",
          ],
          [
            "context",
            "an organism that knows it will die also knows that it escapes experiencing most of the repercussions of its actions. the human that made this program, in making it, is a potential example.",
          ],
          ["comment", 'see initial <em class="uppercase">comment</em>.'],
        ],
      ],
    ],
    [
      "conclude narration",
      "This program simulates the key systems involved in such a process, and takes advantage of being a simulation to offer tools that should lessen the cost of experimentation:",
      [],
    ],
    [
      undefined,
      "<ul>" +
        "<li>You have access to a more flexible control of the flow of time using the <strong>Time Control Panel</strong>.</li>" +
        "<li>You can back up, restore, and/or duplicate your progress in the <strong>Save Data Menu</strong>.</li>" +
        "</ul>",
      [],
    ],
    [
      undefined,
      "You may view this message again at any time in the <strong>Help Menu</strong>.",
      [],
    ],
  ] as const;
</script>

<dialog
  class="max-w-3xl flex-col justify-between gap-2 rounded border-2 border-slate-900 transition-all"
  bind:this={tutorialDialogue}
  on:close={() => (showTutorial = false)}
>
  {#each dialogFragments as fragment, index (index)}
    {#if step >= index}
      <p in:fly={{ x: -400, delay: index === 0 ? 275 : 0 }}>
        {#if fragment[0]}
          <em class="uppercase">{fragment[0]}:</em>
        {/if}
        {@html fragment[1]}
      </p>
      <ul class="flex flex-row">
        {#each fragment[2] as asides, index (index)}
          <li
            class="shrink-0 grow basis-1/2"
            in:fly={{ x: 100, delay: 275 * (index + 1) }}
          >
            <details class="bg-slate-200">
              <summary class="cursor-pointer uppercase">aside</summary>
              <aside class="flex flex-col justify-between gap-2">
                {#each asides as asideFragment, aIndex (aIndex)}
                  <p>
                    {#if asideFragment[0]}
                      <em class="uppercase">{asideFragment[0]}:</em>
                    {/if}
                    {@html asideFragment[1]}
                  </p>
                {/each}
              </aside>
            </details>
          </li>
        {/each}
      </ul>
    {/if}
  {/each}

  <form method="dialog" class="flex flex-row flex-nowrap justify-center">
    {#if step === dialogFragments.length - 1}
      <button type="submit" class="rounded border-2 border-slate-500 p-2"
        >Begin!</button
      >
    {:else}
      <button
        type="button"
        class="rounded border-2 border-slate-500 p-2"
        on:click={() => step++}>Next</button
      >
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
  :global(dialog abbr) {
    text-transform: full-width;
  }
  :global(dialog p :is(ul, li)) {
    list-style: inside;
  }
  details {
    margin-left: 0.5rem;
    border-radius: 1rem;
    /*--tw-bg-opacity: 1;*/
    /*background-color: rgb(241 245 249 / var(--tw-bg-opacity)); !*slate-100*!*/
    padding: 0.5rem;
  }
  details[open] > summary::after {
    content: ":";
  }
</style>
