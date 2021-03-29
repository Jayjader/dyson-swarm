<script lang="ts">
  import Table from "./table.svelte";
  import Breaker from "./breaker.svelte";
  import type {
    BuildChoice,
    Buildings,
    GameState,
    Resources,
    Result,
    Swarm,
  } from "./types";
  import { ok } from "./types";
  import { build, tripBreaker, update } from "./actions";
  import { onDestroy } from "svelte";
  import SwarmDisplay from "./Swarm.svelte";
  import BuildMenu from "./BuildMenu.svelte";

  export let init: { resources: Resources; buildings: Buildings; swarm: Swarm };
  let autoBuildChoice: BuildChoice = null;

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
      if (autoBuildChoice !== null) {
        state.dispatch(build[autoBuildChoice]);
      }
      state.dispatch(update);
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
      contents={Object.entries(state.resources)}
      orientation="left"
    />
    <SwarmDisplay count={state.swarm.satellites} />
    <Table caption="buildings" contents={Object.entries(state.buildings)} />
  </div>

  <Breaker
    tripped={state.breaker.tripped}
    on:change={() => state.dispatch(tripBreaker)}
  />
  <BuildMenu dispatch={state.dispatch} bind:autoBuildChoice />
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
