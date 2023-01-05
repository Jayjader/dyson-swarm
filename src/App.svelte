<!-- @component Top-level of dyson swarm application -->
<script lang="ts">
  import "./app.css";
  import ResourceHud from "./ResourceHud.svelte";
  import SwarmHud from "./hud/SwarmHud.svelte";
  import Fabricator from "./fabricator/Fabricator.svelte";
  import BuildQueue from "./fabricator/BuildQueue.svelte";
  import { canBuild, launchCost, launchSatellite } from "./actions";
  import { onDestroy } from "svelte";
  import type { GameState } from "./gameStateStore";
  import {
    Construct,
    createGameStateStore,
    resourceArray,
  } from "./gameStateStore";
  import { fabricator } from "./fabricator/store";
  import type { Clock, Play } from "./time/store";
  import { clock, isPlay } from "./time/store";
  import PanelSelector from "./panel-control/PanelSelector.svelte";
  import { uiPanelsState } from "./panel-control/store";
  import TimeControl from "./time/TimeControl.svelte";
  import ProgressOverview from "./overview/ProgressOverview.svelte";
  import ConstructOverview from "./overview/ConstructOverview.svelte";
  import StorageOverview from "./overview/StorageOverview.svelte";

  export let init: GameState;

  const state = createGameStateStore(init);
  const resources = resourceArray(state);

  let timeStampOfLastTick = window.performance.now();
  let animationFrame: number = 0;

  let autoLaunch = false;

  function scheduleCallback(callback) {
    animationFrame = window.requestAnimationFrame(callback);
    console.debug({ command: "schedule-callback", animationFrame });
  }
  function cancelCallback() {
    console.debug({ command: "cancel-callback", animationFrame });
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function advanceClock(
    nextTimeStamp: DOMHighResTimeStamp,
    options: { resume: boolean } = { resume: false }
  ) {
    console.debug({ command: "advance-clock", nextTimeStamp, options });
    if ($state.swarm.satellites >= 2 ** 50) {
      cancelCallback();
      return alert(
        "You've successfully launched enough satellites into the star's orbit to capture and redirect the majority of its output!\nThanks for playing for so long with such tedious controls 😅\nIf you want to play again, please refresh the page.\nThis game is not finished being developed. While there is no way to subscribe to updates (yet), a good rule of thumb is to be ready to wait several months before a new version is published."
      );
    }
    // don't catch up passed time if clock was paused
    if (options.resume) {
      timeStampOfLastTick = nextTimeStamp;
    }
    const timeElapsed = Math.floor(nextTimeStamp - timeStampOfLastTick);
    const timeStep = Math.floor(1000 / ($clock.slice(-1) as Play)[0].speed);
    const ticks = Math.floor(timeElapsed / timeStep);
    for (let tick = 0; tick < ticks; tick++) {
      clock.increment();
    }
    if (ticks > 0) {
      timeStampOfLastTick += ticks * timeStep;
      console.info({
        command: "clock-increments",
        timeElapsed,
        ticks,
        timeStep,
        timeStampOfLastTick,
      });
    } else {
      console.debug({
        command: "clock-increments",
        timeElapsed,
        ticks,
        timeStep,
        timeStampOfLastTick,
      });
    }
    // TODO: investigate if it's better to schedule the next frame *before* we're done processing this one
    scheduleCallback(advanceClock);
  }

  function mainLoop() {
    const action = $fabricator.work($state.resources);
    if (action) {
      state.action(action);
    }
    if (autoLaunch) {
      new Array($state.buildings[Construct.SATELLITE_LAUNCHER])
        .fill(undefined)
        .forEach(() => {
          if (canBuild(launchCost, $state.resources)) {
            state.action(launchSatellite);
          }
        });
    }
    state.tick();
  }

  clock.subscribe((nextState: Clock) => {
    console.debug({ command: "app->clock.subscribe", nextState });
    if (isPlay(nextState)) {
      console.time("main loop");
      mainLoop();
      console.timeEnd("main loop");
      if (!animationFrame) {
        scheduleCallback((nextTimeStamp) =>
          advanceClock(nextTimeStamp, { resume: true })
        );
      }
    } else {
      if (animationFrame) {
        cancelCallback();
        return;
      }
    }
  });
  onDestroy(() => window.cancelAnimationFrame(animationFrame));
</script>

<main
  class="m-0 flex flex-col flex-nowrap items-stretch justify-between gap-2 p-0"
>
  <div class="flex flex-grow-0 flex-col gap-2">
    <div class="flex flex-row justify-between text-stone-200">
      <ResourceHud resources={$resources} />
      <SwarmHud swarm={{ count: $state.swarm.satellites }} />
    </div>

    <div class="flex flex-row flex-wrap justify-around gap-2">
      <TimeControl />
      {#if $state.swarm.satellites > 0}
        <ProgressOverview swarm={{ count: $state.swarm.satellites }} />
      {/if}
    </div>
  </div>

  <div class="panels grid-auto grid overflow-y-scroll" style="--gap: 0.5rem">
    {#if $uiPanelsState.has("construct-overview")}
      <ConstructOverview
        constructs={$state.working}
        circuitBreaker={$state.breaker}
      />
    {/if}
    {#if $uiPanelsState.has("storage-overview")}
      <StorageOverview />
    {/if}
    {#if $uiPanelsState.has("fabricator")}
      <Fabricator resources={$state.resources} />
    {/if}
  </div>
  <PanelSelector />
</main>

<style>
  main {
    height: calc(100vh - 1rem);
    max-height: calc(100vh - 1rem);
  }
  .panels {
    min-height: 10rem;
  }
  .panels > :global(section:nth-child(3)) {
    grid-column: 1/-1;
  }
  .grid-auto {
    --gap: initial;
    gap: var(--gap);
    /*
    thank you css tricks for the following implementation of a grid with:
     - max number of columns (this is grid columns, not "columns of content" => +1)
     - min width of column content
     https://css-tricks.com/an-auto-filling-css-grid-with-max-columns/
    */
    --item-min-width: 30rem;
    --max-columns: 3;
    --item-max-width: calc(
      (100% - ((var(--max-columns) - 1) * var(--gap))) /
        (var(--max-columns) - 1)
    );
    grid-template-columns: repeat(
      auto-fill,
      minmax(max(var(--item-min-width), var(--item-max-width)), 1fr)
    );
  }
</style>
