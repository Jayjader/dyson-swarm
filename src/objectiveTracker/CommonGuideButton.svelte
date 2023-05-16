<script lang="ts">
  export let disabled: boolean = false;
  $: classes = disabled
    ? "border-slate-500 text-slate-600 cursor-not-allowed"
    : "border-slate-900 text-slate-900";
</script>

<button {disabled} on:click class="rounded border-2 {classes} p-4"
  ><slot /></button
>
