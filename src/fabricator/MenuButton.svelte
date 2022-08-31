<script lang="ts">
  export let text;
  export let disabled: boolean = false;
</script>

<button
  class="border-2 rounded-sm border-indigo-300 text-indigo-300 px-1 disabled:border-dashed"
  on:click
  {disabled}
>
  {text}
</button>
