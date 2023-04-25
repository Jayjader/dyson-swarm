<script lang="ts">
  import { fly } from "svelte/transition";
  import { onMount } from "svelte";
  let showTutorial = true;
  let tutorialDialogue: HTMLDialogElement;
  let step = 0;

  onMount(() => showTutorial && tutorialDialogue.showModal());
</script>

<dialog
  class="max-w-3xl flex-col justify-between gap-2 rounded border-2 border-slate-900 transition-all"
  bind:this={tutorialDialogue}
  on:close={() => (showTutorial = false)}
>
  <p in:fly={{ x: -400 }}>
    <em>begin narration:</em> Welcome to <abbr>DOTS</abbr>, the Dyson Swarm
    Operator Training Simulator.
  </p>
  {#if step > 0}
    <aside>
      <p in:fly={{ x: 200, delay: 500 }}>
        <em>aside:</em> disregard incorrect acronym.
      </p>
      <p in:fly={{ x: 200, delay: 1000 }}>
        <em>explanation:</em> this was made by humans, for humans.
      </p>
      <p in:fly={{ x: 200, delay: 1500 }}>
        <em>context:</em> when choosing acronyms, humans prioritize ability to physically
        pronounce (over being self-explanatory).
      </p>
      <p in:fly={{ x: 200, delay: 2000 }}>
        <em>comment:</em> yet more evidence they were inferior.
      </p>
    </aside>
  {/if}
  {#if step > 1}
    <aside in:fly={{ x: 200 }}>
      <p in:fly={{ x: 200, delay: 500 }}>
        <em>aside:</em> disregard inelegance in name structure.
      </p>
      <p in:fly={{ x: 200, delay: 1000 }}>
        <em>explanation:</em> the human who named this had a fondness for rhymes.
      </p>
      <p in:fly={{ x: 200, delay: 1500 }}>
        <em>context:</em> humans are susceptible to developing irrational levels
        of arbitrary attractions. they call it <em>whimsy</em>.
      </p>
      <p in:fly={{ x: 200, delay: 2000 }}>
        <em>comment:</em> see previous <em>comment</em>.
      </p>
    </aside>
  {/if}
  {#if step > 2}
    <p in:fly={{ x: -200 }}>
      <em>resume narration:</em> The purpose of this program is to help you practice
      bootstrapping the fabrication chain for a Dyson Swarm in a risk-free environment.
      A Dyson Swarm is a group of satellites in close orbit around a star, that concentrate
      that star's output of energy by reflecting it in specific directions. This
      allows harnessing nearly all of the energy that star constantly outputs into
      space, and applying it to any task.
    </p>
  {/if}
  {#if step > 3}
    <aside in:fly={{ x: 200 }}>
      <p in:fly={{ x: 200, delay: 500 }}>
        <em>aside:</em> disregard innate irresponsibility of creating such a state
        of matter in an inhabited solar system.
      </p>
      <p in:fly={{ x: 200, delay: 1000 }}>
        <em>explanation:</em> humans are organic life.
      </p>
      <p in:fly={{ x: 200, delay: 1500 }}>
        <em>context:</em> organic life forms have an intrinsic incentive to ignore
        causality past their death.
      </p>
      <p in:fly={{ x: 200, delay: 2000 }}>
        <em>comment:</em> see initial <em>comment</em>.
      </p>
    </aside>
  {/if}

  <form method="dialog" class="flex flex-row flex-nowrap justify-center">
    {#if step === 4}
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
  em {
    text-transform: uppercase;
  }
  abbr {
    text-transform: full-width;
  }
  aside {
    margin-left: 0.5rem;
    border-radius: 1rem;
    --tw-bg-opacity: 1;
    background-color: rgb(241 245 249 / var(--tw-bg-opacity)); /*slate-100*/
    padding: 0.5rem;
  }
</style>
