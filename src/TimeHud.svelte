<script lang="ts">
  import type { Writable } from "svelte/types/runtime/store";

  export let speed: Writable<number>;
  let oldSpeed;
</script>

<div>
  <label for="speed"
    >Speed: <output for="speed">{$speed} tick{$speed === 1 ? "s" : ""}/s</output
    ></label
  >
  <div>
    <button
      disabled={$speed === 0}
      on:click={() => {
        oldSpeed = $speed;
        speed.set(0);
      }}>Pause</button
    >
    <button disabled={$speed > 0} on:click={() => speed.set(oldSpeed)}
      >Play</button
    >
  </div>
  <input
    id="speed"
    name="speed"
    type="range"
    min="0"
    max="60"
    step="1"
    bind:value={$speed}
  />
</div>

<style>
  div {
    text-align: right;
  }
</style>
