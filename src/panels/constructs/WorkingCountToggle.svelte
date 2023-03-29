<script lang="ts">
  export let disabled: boolean = false;
</script>

<button
  class="rounded border-2 border-zinc-50 px-1 disabled:bg-slate-700 disabled:border-dashed disabled:border-zinc-400"
  {disabled}
  on:click><slot /></button
>
