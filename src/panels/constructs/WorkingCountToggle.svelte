<script lang="ts">
  export let disabled: boolean = false;
</script>

<button
  class="rounded border-2 border-zinc-50 bg-transparent px-1 text-zinc-900 disabled:border-zinc-900 disabled:bg-zinc-900 disabled:text-slate-100"
  {disabled}
  on:click><slot /></button
>
