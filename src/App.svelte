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
  import {
    createGameState,
    resourceArray,
    tickConsumption,
    tickProduction,
  } from "./gameStateStore";
  import ResourceHud from "./ResourceHud.svelte";
  import LaunchButton from "./LaunchButton.svelte";
  import SwarmHud from "./SwarmHud.svelte";

  export let init: GameState;
  let autoBuildChoice: BuildChoice = null;

  const state = createGameState(init);
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
  <Table
    caption="resources"
    contents={Object.entries($state.resources)}
    orientation="left"
  />
  <Table caption="buildings" contents={Object.entries($state.buildings)} />

  <ul style="display: none" class="control-panel">
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

  <div style="display: none" class="tables">
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
    --col-count: 2;
    --row-count: 3;
    display: grid;
    column-gap: 0.25em;
    grid-template-columns: 1em repeat(var(--col-count), 1fr) 1em;
    grid-template-rows: 1em repeat(var(--row-count), 1fr) 1em;
    grid-template-areas:
      ". . . ."
      ". HUD HUD ."
      ". PanelLeft PanelRight ."
      ". PanelLeft PanelRight ."
      ". . . .";
    text-align: center;
    padding: 1em;
    max-width: 90%;
    margin: 0 auto;
    background-color: #dddddd;
  }

  main > * {
    grid-row: -2;
    grid-column: -2;
  }

  @media (min-width: 650px) {
    main {
      --col-count: 6;
    }
  }

  .HUD {
    grid-area: HUD;
    display: grid;
    grid-template-columns:
      minmax(1em, 1fr) minmax(1fr, 30%) minmax(1fr, 10%) minmax(1fr, 30%)
      minmax(1em, 1fr);
    grid-template-areas: ". resources swarm buildings .";
  }

  .tables {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-evenly;
  }

  .control-panel {
    list-style: none;
    display: flex;
    flex-flow: column;
  }
</style>
