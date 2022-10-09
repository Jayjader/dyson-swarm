<script lang="ts">
  export let open: boolean = false;
  $: border = open ? "border-red-400" : "border-blue-400";
  $: text = open ? `text-red-400` : "text-blue-400";
</script>

<label
  class="basis-full border-8 rounded-xl {border} pt-1 pb-2 flex flex-col justify-center items-stretch text-center {text} cursor-pointer"
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
