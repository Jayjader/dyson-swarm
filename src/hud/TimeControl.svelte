<script lang="ts">
  import {
    type ClockState,
    getPrimitive,
    isEditing,
    isIndirectPause,
    isPlay,
  } from "./types";
  import { getClock } from "../events/processes/clock";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../events";
  import type { BusEvent as BusEvent } from "../events/events";

  const simulation = getContext(SIMULATION_STORE).simulation;

  let displayedSpeed = 1;
  let speedIsBeingEdited = false;
  let currentTick = 0;
  let clock: ClockState = [{ tick: 0, speed: 1 }];
  let disabled = false;

  const unsubscribe = simulation.subscribe((sim) => {
    clock = getClock(sim);
    disabled = isIndirectPause(clock);
    if (isEditing(clock)) {
      /* nothing to do here, the rest of local state is piloted solely by ui in this case */
      return;
    }
    const { speed, tick } = getPrimitive(clock);
    displayedSpeed = speed;
    currentTick = tick;
  });

  function play() {
    const playEvent: BusEvent = {
      tag: "command-simulation-clock-play",
      timeStamp: performance.now(),
      afterTick: currentTick,
    } as const;
    console.info({ playEvent });
    simulation.broadcastEvent(playEvent);
    simulation.processUntilSettled();
  }
  function pause() {
    const pauseEvent = {
      tag: "command-simulation-clock-pause",
      timeStamp: performance.now(),
      afterTick: currentTick,
    } as const;
    console.info({ pauseEvent });
    simulation.broadcastEvent(pauseEvent);
    simulation.processUntilSettled();
  }
  function setSpeed(event) {
    if (!isEditing(clock)) {
      simulation.broadcastEvent({
        tag: "command-simulation-clock-start-editing-speed",
        timeStamp: performance.now(),
        afterTick: currentTick,
      });
    }
    const newSpeed = Number.parseInt(event.target.value);
    displayedSpeed = newSpeed;
    if (!speedIsBeingEdited) {
      const setSpeedEvent = {
        tag: "command-simulation-clock-set-speed",
        speed: newSpeed,
        timeStamp: performance.now(),
        afterTick: currentTick,
      } as const;
      console.info({ setSpeedEvent });
      simulation.broadcastEvent(setSpeedEvent);
      simulation.processUntilSettled();
    }
  }
  function startEditingSpeed() {
    const startSpeedEvent: BusEvent = {
      tag: "command-simulation-clock-start-editing-speed",
      timeStamp: performance.now(),
      afterTick: currentTick,
    } as const;
    console.info({ startSpeedEvent });
    simulation.broadcastEvent(startSpeedEvent);
    simulation.processUntilSettled();
    speedIsBeingEdited = true;
  }
  function editSpeedFromMouseEvent(event) {
    // we need this guard or else this will fire whenever the mouse moves over the input element
    if (speedIsBeingEdited) {
      const newSpeed = Number.parseInt(event.target.value);
      if (newSpeed !== displayedSpeed) {
        console.info({
          command: "setting-speed-from-mouse",
          speed: newSpeed,
        });
        displayedSpeed = newSpeed;
      }
    }
  }
  function stopEditingSpeed() {
    const stopEditingEvent: BusEvent = {
      tag: "command-simulation-clock-set-speed",
      speed: displayedSpeed,
      timeStamp: performance.now(),
      afterTick: getPrimitive(clock).tick,
    } as const;
    console.info({ stopEditingEvent });
    simulation.broadcastEvent(stopEditingEvent);
    simulation.processUntilSettled();
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
<!--  uncomment following line to debug clock state-->
<!--  <div class="bg-slate-50 text-stone-900">{JSON.stringify(clock)}</div>-->
  <div class="flex flex-row justify-evenly gap-1">
    <label
      class="flex cursor-pointer flex-row justify-between gap-1"
      class:cursor-not-allowed={disabled}
    >
      Pause
      <input
        type="radio"
        class="mr-1 disabled:cursor-not-allowed"
        value="pause"
        checked={!isPlay(clock)}
        on:change={pause}
        {disabled}
      />
    </label>
    <label
      class="flex cursor-pointer flex-row justify-between gap-1"
      class:cursor-not-allowed={disabled}
    >
      Play
      <input
        type="radio"
        class="disabled:cursor-not-allowed"
        value="play"
        checked={isPlay(clock)}
        on:change={play}
        {disabled}
      />
    </label>
  </div>
  <!-- TODO: handle touch events 
        see https://web.dev/mobile-touch/ and https://web.dev/mobile-touchandmouse/
  -->
</div>
