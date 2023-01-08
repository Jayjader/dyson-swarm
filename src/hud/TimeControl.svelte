<script lang="ts">
  import { type ClockState, isPlay } from "./types";
  import { getClock } from "../events/processes/clock";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../events";
  import type { BusEvent as BusEvent } from "../events/events";

  const simulation = getContext(SIMULATION_STORE).simulation;

  let displayedSpeed = 1;
  let speedIsBeingEdited = false;
  let currentTick = 0;
  let clock: ClockState = [{ tick: 0, speed: 1 }];

  const unsubscribe = simulation.subscribe((sim) => {
    clock = getClock(sim);
    if (isPlay(clock)) {
      displayedSpeed = clock[0].speed;
      currentTick = clock[0].tick;
    } else {
      displayedSpeed = clock[1].speed;
      currentTick = clock[1].tick;
    }
  });

  function play() {
    const busEvent: BusEvent = {
      tag: "command-simulation-clock-play",
      timeStamp: performance.now(),
      afterTick: currentTick,
    } as const;
    console.info(busEvent);
    simulation.broadcastEvent(busEvent);
    simulation.processUntilSettled();
  }
  function pause() {
    const busEvent = {
      tag: "command-simulation-clock-pause",
      timeStamp: performance.now(),
      afterTick: currentTick,
    } as const;
    console.info(busEvent);
    simulation.broadcastEvent(busEvent);
  }
  function setSpeed(event) {
    const newSpeed = Number.parseInt(event.target.value);
    const busEvent = {
      tag: "command-simulation-clock-set-speed",
      speed: newSpeed,
      timeStamp: performance.now(),
      afterTick: currentTick,
    } as const;
    console.info(busEvent);
    simulation.broadcastEvent(busEvent);
  }
  function startEditingSpeed() {
    const busEvent: BusEvent = {
      tag: "command-simulation-clock-indirect-pause",
      timeStamp: performance.now(),
      afterTick: currentTick,
    } as const;
    console.info({ busEvent });
    simulation.broadcastEvent(busEvent);
    speedIsBeingEdited = true;
  }
  function editSpeedFromMouseEvent(event) {
    // we need this guard or else this will fire whenever the mouse moves over the input element
    if (speedIsBeingEdited) {
      const newSpeed = Number.parseInt(event.target.value);
      if (newSpeed !== displayedSpeed) {
        const busEvent: BusEvent = {
          tag: "command-simulation-clock-set-speed",
          speed: newSpeed,
          timeStamp: performance.now(),
          afterTick: clock[1].tick,
        } as const;
        console.info(busEvent);
        simulation.broadcastEvent(busEvent);
        displayedSpeed = newSpeed;
      }
    }
  }
  function stopEditingSpeed() {
    const busEvent: BusEvent = {
      tag: "command-simulation-clock-indirect-resume",
      timeStamp: performance.now(),
      afterTick: clock[1].tick,
    } as const;
    console.info(busEvent);
    simulation.broadcastEvent(busEvent);
    speedIsBeingEdited = false;
  }
  onDestroy(unsubscribe);
</script>

<div
  class="flex flex-col items-stretch justify-around rounded border-2 border-slate-100 bg-stone-800 px-1 text-right text-slate-100"
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
  <div class="flex flex-row justify-evenly gap-1">
    <label class="flex cursor-pointer flex-row justify-between gap-1">
      Pause
      <input
        type="radio"
        class="mr-1"
        value="pause"
        checked={!isPlay(clock)}
        on:change={pause}
      />
    </label>
    <label class="flex cursor-pointer flex-row justify-between gap-1">
      Play
      <input
        type="radio"
        value="play"
        checked={isPlay(clock)}
        on:change={play}
      />
    </label>
  </div>
  <!-- TODO: handle touch events 
        see https://web.dev/mobile-touch/ and https://web.dev/mobile-touchandmouse/
  -->
</div>