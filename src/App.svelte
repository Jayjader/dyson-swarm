<script lang="ts">
  import Table from "./table.svelte";
  import Breaker from "./breaker.svelte";
  import type { BuildChoice, GameState } from "./types";
  import {
    build,
    launchSatellite,
    tripBreaker,
    constructionCosts,
  } from "./actions";
  import { onDestroy } from "svelte";
  import SwarmDisplay from "./Swarm.svelte";
  import BuildMenu from "./BuildMenu.svelte";
  import {
    createGameState,
    tickProduction,
    tickConsumption,
  } from "./gameStateStore";
  import LaunchButton from "./LaunchButton.svelte";

  export let init: GameState;
  let autoBuildChoice: BuildChoice = null;

  const state = createGameState(init);

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
  <div class="tables">
    <Table
      caption="resources"
      contents={Object.entries($state.resources)}
      orientation="left"
    />
    <SwarmDisplay count={$state.swarm.satellites} />
    <Table caption="buildings" contents={Object.entries($state.buildings)} />
  </div>

  <LaunchButton on:click={() => state.action(launchSatellite)} />
  <Breaker
    tripped={$state.breaker.tripped}
    on:change={() => state.action(tripBreaker)}
  />
  <BuildMenu dispatch={state.action} bind:autoBuildChoice />

  <div class="tables">
    <table>
      <caption>Build Costs</caption>
      {#each Object.entries(constructionCosts) as [building, costs] (building)}
        <tr>
          <th>{building}</th>
          {#each Object.entries(costs) as [resource, amount] (resource)}
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
          {#each Object.entries(inputs) as [resource, amount] (resource)}
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
          {#each Object.entries(outputs) as [resource, amount] (resource)}
            <td>{resource}: {amount}</td>
          {/each}
        </tr>
      {/each}
    </table>
  </div>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 320px;
    margin: 0 auto;
    background-color: #dddddd;
  }

  .tables {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-evenly;
  }

  @media (min-width: 640px) {
    main {
      max-width: 90%;
    }
  }
</style>
