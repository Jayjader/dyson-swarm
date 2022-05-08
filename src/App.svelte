<!-- @component Top-level of dyson swarm application -->
<script lang="ts">
  import Table from "./Table.svelte";
  import Breaker from "./Breaker.svelte";
  import WorkerToggle from "./WorkerToggle.svelte";
  import type { BuildChoice, GameState } from "./types";
  import {
    build,
    constructionCosts,
    launchSatellite,
    toggleWorker,
    tripBreaker,
  } from "./actions";
  import { onDestroy } from "svelte";
  import BuildMenu from "./BuildMenu.svelte";
  import type { GameStateStore } from "./gameStateStore";
  import {
    createGameStateStore,
    resourceArray,
    tickConsumption,
    tickProduction,
  } from "./gameStateStore";
  import ResourceHud from "./ResourceHud.svelte";
  import LaunchButton from "./LaunchButton.svelte";
  import SwarmHud from "./SwarmHud.svelte";

  export let init: GameState = undefined;
  let autoBuildChoice: BuildChoice = null;

  const state = createGameStateStore(init);
  const resources = resourceArray(state);

  const timeStep = 1000;
  let lastTimeStamp = window.performance.now();
  let animationFrame: number;

  function mainLoop(nextTimeStamp: number) {
    animationFrame = window.requestAnimationFrame(mainLoop);
    const timeElapsed = nextTimeStamp - lastTimeStamp;
    if (timeElapsed < timeStep) {
      return;
    }
    let delta = timeElapsed;
    while (delta > timeStep) {
      delta -= timeStep;
      if (autoBuildChoice !== null) {
        console.debug(`building ${autoBuildChoice}`);
        state.action(build(autoBuildChoice));
      }
      state.tick();
    }
    lastTimeStamp = nextTimeStamp - delta;
  }

  onDestroy(() => window.cancelAnimationFrame(animationFrame));
  mainLoop(lastTimeStamp);
</script>

<main>
  <div class="HUD">
    <ResourceHud resources={$resources} />
    <SwarmHud swarm={{ count: $state.swarm.satellites }} />
  </div>
  <Table caption="resources" contents={$resources} orientation="left" />
  <Table caption="buildings" contents={Object.entries($state.buildings)} />

  <ul style="" class="control-panel">
    <li>
      <LaunchButton on:click={() => state.action(launchSatellite)} />
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
  <BuildMenu dispatch={state.action} bind:autoBuildChoice />

  <div class="tables">
    <table>
      <caption>Build Costs</caption>
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
      <caption>Building Consumption (per tick)</caption>
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
      <caption>Building Production (per tick)</caption>
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
    display: grid;
    column-gap: 0.25em;
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
      ". ControlPanel ControlPanel ."
      ". . . .";
    grid-auto-columns: 100%;
    grid-auto-rows: max-content;
    text-align: center;
    padding: 0;
    margin: 0;
    background-color: #dddddd;
  }

  main > * {
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
        ". PanelLeft . ControlPanel ControlPanel . PanelRight ."
        ". . . . . . . . ";
      grid-template-columns: 1em 1fr 1em 1fr 1fr 1em 1fr 1em;
    }
  }

  .HUD {
    grid-area: HUD;
    display: grid;
    grid-template-columns: minmax(30vw, 1fr) 10vw minmax(30vw, 1fr);
    grid-template-areas: "resources swarm buildings";
  }

  .tables {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-evenly;
    /* TODO: implement this more cleanly */
    grid-column: 1/-1;
    grid-row: calc(
      5 + var(--panel-row-count) + 1
    ); /* place after last row in template*/
  }

  .control-panel {
    list-style: none;
    display: flex;
    flex-flow: column;
    grid-area: ControlPanel;
  }
</style>
