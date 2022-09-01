<script lang="ts">
  export let mode;
  export let isRepeat;
</script>

<li
  class="border-2 rounded-sm"
  class:border-sky-500={!isRepeat}
  class:border-pink-400={isRepeat}
  class:border-rose-500={mode === "remove-build-order"}
  class:hover:border-rose-600={mode === "remove-build-order"}
  class:active:border-rose-600={mode === "remove-build-order"}
  class:bg-color-fill={mode === "remove-build-order"}
>
  <slot />
</li>
