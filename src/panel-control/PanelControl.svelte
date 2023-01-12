<script lang="ts">
  export let meta = false;
  export let disabled: boolean = false;
  export let on: boolean = false;
</script>

<button
  class:meta
  class={"rounded border-2 border-slate-100 text-slate-100 disabled:border-dashed" +
    (on ? " bg-slate-100 text-slate-900" : "")}
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
