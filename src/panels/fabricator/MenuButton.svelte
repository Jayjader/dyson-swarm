<script lang="ts">
  export let text;
  export let disabled: boolean = false;
</script>

<button
  class="rounded-sm border-2 border-indigo-300 px-1 text-indigo-300 disabled:border-dashed disabled:border-slate-500 disabled:text-slate-500"
  on:click
  {disabled}
>
  {text}
</button>
