<script lang="ts">
  let hovering = false;
</script>

<!--  class="flex flex-col items-start"-->
<button
  class:bg-rose-800={hovering}
  class="m-0 p-0"
  style="width: 100%/*todo: display: contents*/"
  on:mouseover|stopPropagation={() => {
    hovering = true;
    console.log({ hovering });
  }}
  on:mouseout|stopPropagation={() => {
    hovering = false;
    console.log({ hovering });
  }}
  on:click
>
  <slot />
</button>
