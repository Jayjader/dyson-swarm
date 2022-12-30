<script lang="ts">
  export let open: boolean = false;
  $: border = open ? "border-red-400" : "border-blue-400";
  $: text = open ? `text-red-400` : "text-blue-400";
</script>

<label
  class="basis-full rounded-xl border-8 {border} flex flex-col items-stretch justify-center pt-1 pb-2 text-center {text} cursor-pointer"
>
  Circuit Breaker
  <input type="checkbox" readonly bind:checked={open} class="cursor-pointer" />
</label>

<style>
  input::before,
  input::after {
    /* see https://css-tricks.com/fun-times-styling-checkbox-states/ */
  }
</style>
