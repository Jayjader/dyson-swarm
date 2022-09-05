<!-- @component Top-level of dyson swarm application -->
<script lang="ts">
  import "./app.css";
  import Table from "./Table.svelte";
  import Breaker from "./Breaker.svelte";
  import WorkerToggle from "./WorkerToggle.svelte";
  import ResourceHud from "./ResourceHud.svelte";
  import LaunchButton from "./LaunchButton.svelte";
  import SwarmHud from "./hud/SwarmHud.svelte";
  import Fabricator from "./fabricator/Fabricator.svelte";
  import TimeControl from "./time/TimeControl.svelte";
  import BuildQueue from "./fabricator/BuildQueue.svelte";
  import type { GameState } from "./types";
  import { Building, Resource } from "./types";
  import {
    canBuild,
    constructionCosts,
    launchCost,
    launchSatellite,
    toggleWorker,
    tripBreaker,
  } from "./actions";
  import { onDestroy } from "svelte";
  import {
    createGameStateStore,
    resourceArray,
    tickConsumption,
    tickProduction,
  } from "./gameStateStore";
  import { fabricator } from "./fabricator/store";
  import type { Clock, Play } from "./time/store";
  import { clock, isPlay } from "./time/store";
  import { derived, writable } from "svelte/store";

  export let init: GameState = undefined;

  const state = createGameStateStore(init);
  const resources = resourceArray(state);
  const uiStateStack = writable([]);
  const uiPanelsState = {
    ...derived(uiStateStack, (stack) => stack),
    openFabricator: () => {
      console.info({ command: "open-fabricator" });
      uiStateStack.set(["fabricator"]);
    },
    openOverview: () => {
      console.info({ command: "open-overview" });
      uiStateStack.set(["overview"]);
    },
    closePanels: () => {
      console.info({ command: "close-panels" });
      uiStateStack.set([]);
    },
  };

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
    <!--      TODO: Harmonize ?    -->
    <div class="flex flex-col">
      <Table caption="resources" contents={$resources} orientation="left" />
      <Table caption="buildings" contents={Object.entries($state.buildings)} />
    </div>
  {:else if $uiPanelsState?.[0] === "fabricator"}
    <Fabricator resources={$state.resources} />
  {/if}

  <div class="span-entire-row flex flex-row justify-center">
    <button
      class={"border-2 rounded " +
        ($uiPanelsState?.[0] === "fabricator"
          ? "border-stone-400 text-stone-300"
          : "border-stone-600 text-stone-500")}
      on:click={$uiPanelsState?.[0] === "fabricator"
        ? uiPanelsState.closePanels
        : uiPanelsState.openFabricator}
    >
      Fabricator
    </button>
    <button
      class={"border-2 rounded " +
        ($uiPanelsState?.[0] === "overview"
          ? "border-stone-400 text-stone-300"
          : "border-stone-600 text-stone-500")}
      on:click={$uiPanelsState?.[0] === "overview"
        ? uiPanelsState.closePanels
        : uiPanelsState.openOverview}
    >
      Overview
    </button>
  </div>

  {#if $uiPanelsState?.[0] === "overview"}
    <ul style="" class="control-panel list-none flex flex-col">
      <li>
        <LaunchButton
          visible={$state.buildings[Building.SATELLITE_LAUNCHER] > 0}
          disabled={!canBuild(launchCost, $state.resources)}
          bind:auto={autoLaunch}
          on:click={() => {
            console.log("launch");
            state.action(launchSatellite);
          }}
          max={launchCost.get(Resource.ELECTRICITY)}
          value={Math.min(
            launchCost.get(Resource.ELECTRICITY),
            $state.resources[Resource.ELECTRICITY]
          )}
        />
      </li>
      <li>
        <Breaker
          tripped={$state.breaker.tripped}
          on:change={() => state.action(tripBreaker)}
        />
      </li>
      <li>
        <ul>
          {#each Object.keys(tickConsumption) as worker (worker)}
            <li>
              <WorkerToggle
                paused={!$state.working[worker]}
                on:change={() => state.action(toggleWorker(worker))}
              >
                {worker}
              </WorkerToggle>
            </li>
          {/each}
        </ul>
      </li>
      <li>
        <TimeControl />
      </li>
    </ul>
  {:else if $uiPanelsState?.[0] === "fabricator"}
    <BuildQueue />
  {/if}
  <div class="tables flex flex-row justify-evenly">
    <table>
      <caption class="font-bold">Fabrication Costs</caption>
      {#each Object.entries(constructionCosts) as [building, costs] (building)}
        <tr>
          <th>{building}</th>
          {#each [...costs] as [resource, amount] (resource)}
            <td>{resource}: {amount}</td>
          {/each}
        </tr>
      {/each}
    </table>
    <table>
      <caption class="font-bold">Construct Consumption (per tick)</caption>
      {#each Object.entries(tickConsumption) as [building, inputs] (building)}
        <tr>
          <th>{building}</th>
          {#each [...inputs] as [resource, amount] (resource)}
            <td>{resource}: {amount}</td>
          {/each}
        </tr>
      {/each}
    </table>
    <table>
      <caption class="font-bold">Construct Production (per tick)</caption>
      {#each Object.entries(tickProduction) as [building, outputs] (building)}
        <tr>
          <th>{building}</th>
          {#each [...outputs] as [resource, amount] (resource)}
            <td>{resource}: {amount}</td>
          {/each}
        </tr>
      {/each}
    </table>
  </div>
</main>

<style>
  .span-entire-row {
    grid-column: 1/-1;
  }
  .grid-auto {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    grid-template-rows: repeat(auto-fill, minmax(1em, 1fr));
  }
  .height-parent {
    height: 100%;
  }
</style>
