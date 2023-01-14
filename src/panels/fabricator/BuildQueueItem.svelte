<script lang="ts">
  export let mode;
  export let isRepeat;
</script>

<li
  class="remove rounded border-4 bg-sky-300 text-gray-900"
  class:remove={mode === "remove-build-order"}
  class:border-sky-500={!isRepeat}
  class:border-pink-400={isRepeat}
  class:border-rose-500={mode === "remove-build-order"}
  class:hover:border-rose-600={mode === "remove-build-order"}
  class:active:border-rose-600={mode === "remove-build-order"}
  class:hover:bg-rose-600={mode === "remove-build-order"}
>
  <slot />
</li>

<style>
  li {
    width: clamp(8rem, 24dvw, 20rem);
  }
  li.remove {
    /* to preserve the overall page flow, we increase the width target this should compensate the lack of accompanying buttons contributing to the overall queue sub-panel width*/
    width: clamp(8rem, 36dvw, 20rem);
  }
</style>
