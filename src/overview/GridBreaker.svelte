<script lang="ts">
  export let open: boolean;
  $: color = open ? "red" : "sky";
</script>

<label
  class="basis-full border-8 rounded-xl flex flex-col justify-center items-stretch text-center border-{color}-400 text-{color}-400"
>
  Circuit Breaker
  <input type="checkbox" checked={open} />
</label>
