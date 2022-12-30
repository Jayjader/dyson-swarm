<script lang="ts">
  export let mode;
  export let isRepeat;
</script>

<li
  class="rounded-sm border-4 bg-sky-300 text-gray-900"
  class:border-sky-500={!isRepeat}
  class:border-pink-400={isRepeat}
  class:border-rose-500={mode === "remove-build-order"}
  class:hover:border-rose-600={mode === "remove-build-order"}
  class:active:border-rose-600={mode === "remove-build-order"}
  class:hover:bg-rose-600={mode === "remove-build-order"}
>
  <slot />
</li>
