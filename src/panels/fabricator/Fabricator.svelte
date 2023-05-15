<script lang="ts">
  import Job from "./Job.svelte";
  import BuildQueue from "./BuildQueue.svelte";
</script>

<section class="rounded border-2 border-slate-100 p-2 text-slate-100">
  <h2 class="text-center">Fabricator</h2>
  <div class="flex flex-row flex-wrap gap-2">
    <Job />
    <BuildQueue />
  </div>
</section>

<style>
  section:nth-child(3),
  section:only-child {
    grid-column: 1/-1;
  }
</style>
