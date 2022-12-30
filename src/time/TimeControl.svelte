<script lang="ts">
  import { clock, isPlay } from "./store";

  let displayedSpeed = 1;
  let speedIsBeingEdited = false;
  let currentTick = 0;
  function play() {
    console.info({ command: "play" });
    clock.play();
  }
  function pause() {
    console.info({ command: "pause" });
    clock.pause();
  }
  function setSpeed(event) {
    const newSpeed = Number.parseInt(event.target.value);
    console.info({ command: "set-speed", newSpeed });
    clock.setSpeed(newSpeed);
  }
  function startEditingSpeed() {
    console.info({ command: "start-editing-speed" });
    clock.startIndirectPause();
    speedIsBeingEdited = true;
  }
  function editSpeedFromMouseEvent(event) {
    // we need this guard or else this will fire whenever the mouse moves over the input element
    if (speedIsBeingEdited) {
      const newSpeed = Number.parseInt(event.target.value);
      if (newSpeed !== displayedSpeed) {
        console.debug({ command: "set-speed", newSpeed });
        displayedSpeed = newSpeed;
      }
    }
  }
  function stopEditingSpeed() {
    console.info({ command: "stop-editing-speed" });
    clock.stopIndirectPause();
    speedIsBeingEdited = false;
  }

  clock.subscribe((data) => {
    console.debug({ command: "time-control->clock.subscribe", data });
    if (isPlay(data)) {
      displayedSpeed = data[0].speed;
      currentTick = data[0].tick;
    } else {
      displayedSpeed = data[1].speed;
      currentTick = data[1].tick;
    }
  });
</script>

<div
  class="text-right border-2 rounded border-slate-100 bg-stone-800 text-slate-100 px-1 flex flex-col items-stretch"
>
  <label class="flex gap-1">
    Simulation Time: <output>
      {currentTick} tick{currentTick === 1 ? "" : "s"}
    </output>
  </label>
  <label for="speed" class="flex gap-1">
    Clock Speed: <output for="speed"
      >{displayedSpeed} tick{displayedSpeed === 1 ? "" : "s"}/s</output
    >
  </label>
  <input
    id="speed"
    name="speed"
    type="range"
    min="1"
    max="60"
    step="1"
    value={displayedSpeed}
    on:input={setSpeed}
    on:mousedown={startEditingSpeed}
    on:mousemove={editSpeedFromMouseEvent}
    on:mouseup={stopEditingSpeed}
  />
  <div class="flex flex-row gap-1 justify-evenly">
    <label class="flex flex-row gap-1 justify-between cursor-pointer">
      Pause
      <input
        type="radio"
        class="mr-1"
        value="pause"
        checked={!isPlay($clock)}
        on:change={pause}
      />
    </label>
    <label class="flex flex-row gap-1 justify-between cursor-pointer">
      Play
      <input
        type="radio"
        value="play"
        checked={isPlay($clock)}
        on:change={play}
      />
    </label>
  </div>
  <!-- TODO: handle touch events 
        see https://web.dev/mobile-touch/ and https://web.dev/mobile-touchandmouse/
  -->
</div>

<style>
</style>
