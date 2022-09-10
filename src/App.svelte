<!-- @component Top-level of dyson swarm application -->
<script lang="ts">
  import "./app.css";
  import ResourceHud from "./ResourceHud.svelte";
  import SwarmHud from "./hud/SwarmHud.svelte";
  import Fabricator from "./fabricator/Fabricator.svelte";
  import BuildQueue from "./fabricator/BuildQueue.svelte";
  import type { GameState } from "./types";
  import { Building } from "./types";
  import { canBuild, launchCost, launchSatellite } from "./actions";
  import { onDestroy } from "svelte";
  import { createGameStateStore, resourceArray } from "./gameStateStore";
  import { fabricator } from "./fabricator/store";
  import type { Clock, Play } from "./time/store";
  import { clock, isPlay } from "./time/store";
  import PanelControl from "./panel-control/PanelControl.svelte";
  import { uiPanelsState } from "./panel-control/store";
  import ConstructsOverview from "./overview/ConstructsOverview.svelte";

  export let init: GameState = undefined;

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
    // TODO: investigate if it's better to schedule the next frame *after* we're done processing this one
    scheduleCallback(advanceClock);
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
  }

  function mainLoop() {
    const action = $fabricator.work($state.resources);
    if (action) {
      state.action(action);
    }
    if (autoLaunch) {
      new Array($state.buildings[Building.SATELLITE_LAUNCHER])
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

<main class="height-parent grid grid-auto gap-1 p-0 m-0 grid-flow-row-dense">
  <div class="span-entire-row flex flex-row justify-between text-stone-200">
    <ResourceHud resources={$resources} />
    <SwarmHud swarm={{ count: $state.swarm.satellites }} />
  </div>

  {#if $uiPanelsState?.[0] === "overview"}
    <!--      TODO: Resource Overview    -->
    <ConstructsOverview />
  {:else if $uiPanelsState?.[0] === "fabricator"}
    <Fabricator resources={$state.resources} />
    <BuildQueue />
  {/if}
  <PanelControl />
</main>

<style>
  .span-entire-row {
    grid-column: 1/-1;
  }
  .grid-auto {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    grid-template-rows: repeat(auto-fill, minmax(1em, 1fr));
  }
  .height-parent {
    height: 100%;
  }
</style>
