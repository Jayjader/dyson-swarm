<!-- @component Top-level of dyson swarm application -->
<script lang="ts">
  import "./app.css";
  import Table from "./Table.svelte";
  import Breaker from "./Breaker.svelte";
  import WorkerToggle from "./WorkerToggle.svelte";
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
  import ResourceHud from "./ResourceHud.svelte";
  import LaunchButton from "./LaunchButton.svelte";
  import SwarmHud from "./SwarmHud.svelte";
  import Fabricator from "./fabricator/Fabricator.svelte";
  import { fabricator } from "./fabricator/store";
  import TimeHud from "./time/TimeHud.svelte";
  import { clock } from "./time/store";
  import type { Clock } from "./time/store";

  export let init: GameState = undefined;

  const state = createGameStateStore(init);
  const resources = resourceArray(state);

  let lastTimeStamp = window.performance.now();
  let animationFrame: number;

  let autoLaunch = false;

  function continueUpdating(callback) {
    animationFrame = window.requestAnimationFrame(callback);
    console.info({ command: "continue-updating", animationFrame });
  }
  function stopUpdating() {
    window.cancelAnimationFrame(animationFrame);
    console.info({ command: "stop-updating", animationFrame });
  }
  function advanceClock(nextTimeStamp: DOMHighResTimeStamp, resume = false) {
    console.info({ command: "advance-clock", nextTimeStamp, resume });
    if ($state.swarm.satellites >= 2 ** 50) {
      stopUpdating();
      return alert(
        "You've successfully launched enough satellites into the star's orbit to capture and redirect the majority of its output!\nThanks for playing for so long with such tedious controls 😅\nIf you want to play again, please refresh the page.\nThis game is not finished being developed. While there is no way to subscribe to updates (yet), a good rule of thumb is to be ready to wait several months before a new version is published."
      );
    }
    continueUpdating(advanceClock);
    // don't observe passage of real time if game paused
    if (resume) {
      lastTimeStamp = nextTimeStamp;
      return;
    }
    const timeElapsed = nextTimeStamp - lastTimeStamp;
    const ticks = Math.floor(timeElapsed / (1000 / $clock.speed));
    for (let tick = 0; tick < ticks; tick++) {
      clock.increment();
    }
    if (ticks > 0) {
      console.info({
        command: "clock-increment",
        timeElapsed,
        ticks,
        lastTimeStamp,
        nextTimeStamp,
      });
      lastTimeStamp = nextTimeStamp;
    }
  }

  function play() {
    clock.play();
    continueUpdating((timeStamp) => advanceClock(timeStamp, true));
  }
  function pause() {
    clock.pause();
    stopUpdating();
  }
  function setSpeed(event) {
    clock.setSpeed(event.detail);
  }
  function mainLoop(clockSnapshot: Clock) {
    if (clockSnapshot.mode === "pause") {
      return;
    }
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
    mainLoop(nextState);
  });
  onDestroy(() => window.cancelAnimationFrame(animationFrame));
</script>

<main class="grid gap-x-1 p-0 m-0">
  <div style="grid-area: HUD" class="flex flex-row justify-between">
    <ResourceHud resources={$resources} />
    <SwarmHud swarm={{ count: $state.swarm.satellites }} />
    <TimeHud
      clock={$clock}
      on:play={play}
      on:pause={pause}
      on:setSpeed={setSpeed}
    />
  </div>
  <Table caption="resources" contents={$resources} orientation="left" />
  <Table caption="buildings" contents={Object.entries($state.buildings)} />

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
  <Fabricator
    resources={$state.resources}
    on:enterEdit={pause}
    on:saveEdits={play}
    on:cancelEdits={play}
  />

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
  main {
    --panel-col-count: 2;
    --panel-row-count: 1;
    grid-template-columns:
      1em
      repeat(var(--panel-col-count), 1fr)
      1em;
    grid-template-rows:
      1em
      minmax(1em, min-content) /* HUD */
      repeat(var(--panel-row-count), minmax(min-content, auto))
      max-content /* Build Menu */
      min-content /* Control Panel */
      1em;
    grid-template-areas:
      ". . . ."
      ". HUD HUD ."
      ". BuildMenu BuildMenu ."
      ". PanelLeft PanelRight ."
      ". ControlPanel BuildQueue ."
      ". . . .";
    grid-auto-columns: 100%;
    grid-auto-rows: max-content;
    text-align: center;
  }

  main > * {
    background-color: #dddddd;
    /*background: linear-gradient(white, black);*/
    /* Prevent unexpected grid elements from triggering auto-flow (and creating new rows/columns) */
    grid-row: -2;
    grid-column: -2;
  }

  /* TODO: think about making this to like ~820ish to accomodate for the horizontal empty space needed by the Build Menu when "curled up" */
  @media (min-width: 650px) {
    main {
      --panel-col-count: 6;
      grid-template-areas:
        ". . . . . . . ."
        ". HUD HUD HUD HUD HUD HUD ."
        ". PanelLeft . BuildMenu BuildMenu . PanelRight ."
        ". PanelLeft . ControlPanel BuildQueue . PanelRight ."
        ". . . . . . . . ";
      grid-template-columns: 1em 1fr 1em 1fr 1fr 1em 1fr 1em;
    }
  }

  .tables {
    /* TODO: implement this more cleanly */
    grid-column: 1/-1;
    grid-row: calc(
      5 + var(--panel-row-count) + 1
    ); /* place after last row in template*/
  }

  .control-panel {
    grid-area: ControlPanel;
  }
</style>
