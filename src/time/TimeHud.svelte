<script lang="ts">
  import type { Clock } from "./store";
  import { createEventDispatcher } from "svelte";

  export let clock: Clock = { mode: "pause", speed: 1, tick: 0 };

  const dispatch = createEventDispatcher();

  let editingSpeed = false;
  let playBeforeEdit = false;
  function play() {
    playBeforeEdit = true;
    dispatch("play");
  }
  function pause() {
    playBeforeEdit = false;
    dispatch("pause");
  }
  function setSpeed(event) {
    dispatch("setSpeed", Number.parseInt(event.target.value));
  }
  function startEditingSpeed() {
    if (clock.mode === "play") {
      dispatch("pause");
    }
    editingSpeed = true;
  }
  function editSpeedFromMouseEvent(event) {
    if (editingSpeed) {
      displayedSpeed = Number.parseInt(event.target.value);
    }
  }
  function stopEditingSpeed() {
    if (editingSpeed) {
      editingSpeed = false;
    }
    if (playBeforeEdit) {
      dispatch("play");
    }
  }

  let displayedSpeed = clock.speed;
  $: {
    if (!editingSpeed) {
      displayedSpeed = clock.speed;
    }
  }
</script>

<div
  class="text-right border-2 rounded border-stone-800 px-1 flex flex-col items-stretch"
>
  <label class="flex gap-1">
    Simulation Time: <output
      >{clock.tick} tick{clock.tick === 1 ? "" : "s"}</output
    >
  </label>
  <label for="speed" class="flex gap-1">
    Clock Speed: <output for="speed"
      >{displayedSpeed} tick{displayedSpeed === 1 ? "" : "s"}/s</output
    >
  </label>
  <div class="flex flex-row gap-1 justify-evenly">
    <label class="flex flex-row gap-1 justify-between">
      Pause
      <input
        type="radio"
        class="mr-1"
        value="pause"
        checked={clock.mode === "pause"}
        on:change={pause}
      />
    </label>
    <label class="flex flex-row gap-1 justify-between">
      Play
      <input
        type="radio"
        value="play"
        checked={clock.mode === "play"}
        on:change={play}
      />
    </label>
  </div>
  <input
    id="speed"
    name="speed"
    type="range"
    min="0.5"
    max="60"
    step="1"
    value={clock.speed}
    on:change={setSpeed}
    on:mousedown={startEditingSpeed}
    on:mousemove={editSpeedFromMouseEvent}
    on:mouseup={stopEditingSpeed}
  />
</div>

<style>
</style>
