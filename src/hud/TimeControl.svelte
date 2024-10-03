<script lang="ts">
  import { onDestroy } from "svelte";
  import type { FormEventHandler, MouseEventHandler } from "svelte/elements";
  import { type ClockStore } from "../simulation/clockStore";

  export let clockStore: ClockStore;
  let displayedSpeed = 1;
  let speedIsBeingEdited = false;
  let currentTick = 0;
  let currentMode = "pause";
  let disabled = false;

  const unsubscribeFromClock = clockStore.subscribe(
    ({ mode, speed, tick, isInterrupted }) => {
      if (speedIsBeingEdited) {
        return;
      }
      disabled = isInterrupted;
      displayedSpeed = speed;
      currentTick = tick;
      currentMode = mode;
    },
  );

  function play() {
    console.info({
      tag: "command-simulation-clock-play",
      timeStamp: performance.now(),
      afterTick: currentTick,
    });
    clockStore.play();
  }
  function pause() {
    console.info({
      tag: "command-simulation-clock-pause",
      timeStamp: performance.now(),
      afterTick: currentTick,
    });
    clockStore.pause();
  }
  const setSpeed: FormEventHandler<HTMLInputElement> = (event) => {
    if (!disabled) {
      clockStore.interrupt();
    }
    const newSpeed = Number.parseInt((event.target! as HTMLInputElement).value);
    displayedSpeed = newSpeed;
    if (!speedIsBeingEdited) {
      clockStore.setSpeed(newSpeed);
      console.info({
        tag: "command-simulation-clock-set-speed",
        speed: newSpeed,
        timeStamp: performance.now(),
        afterTick: currentTick,
      } as const);
    }
  };
  function startEditingSpeed() {
    clockStore.interrupt();
    console.info({
      tag: "command-simulation-clock-start-editing-speed",
      timeStamp: performance.now(),
      afterTick: currentTick,
    } as const);
    speedIsBeingEdited = true;
  }
  const editSpeedFromMouseEvent: MouseEventHandler<HTMLInputElement> = (
    event,
  ) => {
    // we need this guard or else this will fire whenever the mouse moves over the input element
    if (speedIsBeingEdited) {
      const newSpeed = Number.parseInt(
        (event.target! as HTMLInputElement).value,
      );
      if (newSpeed !== displayedSpeed) {
        console.info({
          command: "setting-speed-from-mouse",
          speed: newSpeed,
        });
        displayedSpeed = newSpeed;
      }
    }
  };
  function stopEditingSpeed() {
    console.info({
      tag: "command-simulation-clock-set-speed",
      speed: displayedSpeed,
      timeStamp: performance.now(),
      afterTick: currentTick,
    } as const);
    clockStore.setSpeed(displayedSpeed);
    clockStore.resume();
    speedIsBeingEdited = false;
  }
  onDestroy(unsubscribeFromClock);
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
  <fieldset class="flex flex-row justify-evenly gap-1">
    <label
      class="flex cursor-pointer flex-row justify-between gap-1"
      class:cursor-not-allowed={disabled}
    >
      Pause
      <input
        type="radio"
        class="mr-1 disabled:cursor-not-allowed"
        value="pause"
        checked={currentMode === "pause"}
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
        checked={currentMode === "play"}
        on:change={play}
        {disabled}
      />
    </label>
  </fieldset>
  <!-- TODO: handle touch events 
        see https://web.dev/mobile-touch/ and https://web.dev/mobile-touchandmouse/
  -->
</div>
