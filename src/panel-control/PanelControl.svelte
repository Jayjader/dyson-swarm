<script lang="ts">
  export let meta = false;
  export let disabled: boolean = false;
  export let on: boolean;
</script>

<button
  class:meta
  class={"rounded border-2 px- " +
    (on
      ? "border-stone-400 text-stone-300"
      : "border-stone-600 text-stone-500")}
  {disabled}
  on:click
>
  <slot />
</button>

<style>
  .meta {
    max-width: 12ch;
  }
</style>
