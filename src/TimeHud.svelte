<script lang="ts">
  import type { Writable } from "svelte/types/runtime/store";

  export let speed: Writable<number>;
  let speedBeforePause = 1;
</script>

<div>
  <label for="speed"
    >Speed: <output for="speed">{$speed} tick{$speed !== 1 ? "" : "s"}/s</output
    ></label
  >
  <div>
    <label
      >Pause<input
        type="radio"
        value="pause"
        checked={$speed === 0}
        on:click={() => {
          speedBeforePause = $speed;
          speed.set(0);
        }}
      /></label
    >
    <label
      >Play<input
        type="radio"
        value="play"
        checked={$speed > 0}
        on:click={() => speed.set(speedBeforePause)}
      /></label
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
  input[type="radio"] {
    margin: 0 0.25rem;
  }
</style>
