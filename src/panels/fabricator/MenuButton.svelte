<script lang="ts">
  export let text;
  export let disabled: boolean = false;
</script>

<button
  style="max-width: 6rem; min-height: 3rem"
  class="break-normal rounded-sm border-2 border-indigo-300 px-1 text-indigo-300 disabled:border-dashed disabled:border-slate-500 disabled:text-slate-500"
  on:click
  {disabled}
>
  {text}
</button>
