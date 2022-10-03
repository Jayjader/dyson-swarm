<script lang="ts">
  export let disabled: boolean = false;
  export let on: boolean;
</script>

<button
  class={"border-2 rounded " +
    (on
      ? "border-stone-400 text-stone-300"
      : "border-stone-600 text-stone-500")}
  {disabled}
  on:click
>
  <slot />
</button>
