<script lang="ts">
  import Table from "./table.svelte";
  import Breaker from "./breaker.svelte";
  import type { Resources, Buildings, Swarm, GameState, Result } from "./types";
  import {
    update,
    launchSatellite,
    buildSolarCollector,
    buildMiner,
    buildRefiner,
    buildSatFactory,
    buildSatLauncher,
    tripBreaker,
  } from "./actions";
  import { ok } from "./types";
  import { onDestroy } from "svelte";
  import Action from "./Action.svelte";

  export let init: { resources: Resources; buildings: Buildings; swarm: Swarm };

  let state: GameState = {
    ...init,
    breaker: { tripped: false },
    dispatch: (action) => {
      const result = action(state) as Result<GameState>;
      if (ok(result)) {
        state = result;
      } else {
        console.log(result);
        // stop update loop
        window.cancelAnimationFrame(animationFrame);
      }
    },
  };

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
      state.dispatch(update);
    }
    lastTimeStamp = nextTimeStamp - delta;
  }

  onDestroy(() => window.cancelAnimationFrame(animationFrame));
  mainLoop(lastTimeStamp);
</script>

<main>
  <div class="tables">
    <Table caption="resources" contents={Object.entries(state.resources)} />
    <Table caption="swarm" contents={Object.entries(state.swarm)} />
    <Table caption="buildings" contents={Object.entries(state.buildings)} />
  </div>

  <Breaker
    tripped={state.breaker.tripped}
    on:change={() => state.dispatch(tripBreaker)}
  />

  <ul class="actions">
    <Action on:click={() => state.dispatch(buildSolarCollector)}>
      Collector
    </Action>
    <Action on:click={() => state.dispatch(buildMiner)}>Miner</Action>
    <Action on:click={() => state.dispatch(buildRefiner)}>Refiner</Action>
    <Action>Build</Action>
    <Action on:click={() => state.dispatch(buildSatFactory)}>
      Sat. Factory
    </Action>
    {#if state.buildings.satelliteLauncher}
      <Action
        on:click={() => state.dispatch(launchSatellite)}
        disabled={state.resources.packagedSatellites === 0}
      >
        Launch Sat.
      </Action>
    {:else}
      <Action
        on:click={() => state.dispatch(buildSatLauncher)}
        disabled={state.buildings.satelliteLauncher}
      >
        Sat. Launcher
      </Action>
    {/if}
  </ul>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 360px;
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
      max-width: none;
    }
  }

  .actions {
    position: absolute;
    right: 3rem;
    bottom: 3rem;
    display: grid;
    list-style-type: none;
    margin: 0;
    padding: 0;
    grid-template-rows: repeat(3, 1fr);
    grid-template-columns: repeat(6, 1fr);
    column-gap: 5px;
    row-gap: 35px;
    width: min-content;
  }
</style>
