<script lang="ts">
  import { createFsm, state as fsmState } from "./fsmStore";
  import { build } from "./actions";
  import type { GameAction } from "./types";
  import type { TransitionConfig } from "svelte/transition";

  export let dispatch: (action: GameAction) => void;

  type Open = "Open";
  type Inactive = "Inactive";
  type Building = "Building";
  type BuildMenuStates = Inactive | Open | Building;

  const buildMenu = createFsm(`
  [ Inactive Building ] 'Open' => Open;
  Open 'Choose building' => Building;
  Open 'Choose Nothing' => Inactive;
  `);
  const state = fsmState<BuildMenuStates>(buildMenu);

  $: doBuild = (action: GameAction) => {
    dispatch(action);
    buildMenu.action("Choose building");
  };

  /*   A
   *  B/|\F
   * --|.|-- "." <=> origin
   *  C\|/E
   *    D
   * */
  const corners = {
    A: { x: 0, y: 1 },
    B: { x: -Math.sqrt(3) / 2, y: 1 / 2 },
    C: { x: -Math.sqrt(3) / 2, y: -1 / 2 },
    D: { x: 0, y: -1 },
    E: { x: Math.sqrt(3) / 2, y: 1 / 2 },
    F: { x: Math.sqrt(3) / 2, y: -1 / 2 },
  };

  function pivot(
    node,
    { corner, angle = (2 * Math.PI) / 3, width = 45, duration = 560 }
  ): TransitionConfig {
    const x = corners[corner].x * width;
    const y = corners[corner].y * width;
    const changeOrigin = `translate(${-x}px, ${-y}px)`;
    const changeBack = `translate(${x}px, ${y}px)`;
    return {
      duration,
      css: (t, u) =>
        [
          "transform:",
          changeOrigin,
          `rotate(${angle * u}rad)`,
          changeBack,
          "scale(2, 2)",
        ].join(" "),
    };
  }
</script>

<div class="actions">
  <ul>
    {#if $state === "Open"}
      <li class="action" transition:pivot={{ corner: "D" }}>
        <button
          on:click={() => doBuild(build.solarCollector)}
          data-augmented-ui="all-hex"
          class="action-content"
        >
          Collector
        </button>
      </li>
      <li class="action" transition:pivot={{ corner: "F" }}>
        <button
          on:click={() => doBuild(build.miner)}
          data-augmented-ui="all-hex"
          class="action-content">Miner</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "C" }}>
        <button
          on:click={() => doBuild(build.refiner)}
          data-augmented-ui="all-hex"
          class="action-content">Refiner</button
        >
      </li>
      <li class="action">
        <button
          on:click={() => buildMenu.action("Choose Nothing")}
          data-augmented-ui="all-hex"
          class="action-content">Nothing</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "E" }}>
        <button
          on:click={() => doBuild(build.satelliteFactory)}
          data-augmented-ui="all-hex"
          class="action-content">Sat. Factory</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "B" }}>
        <button
          on:click={() => doBuild(build.satelliteLauncher)}
          data-augmented-ui="all-hex"
          class="action-content"
        >
          Sat. Launcher</button
        >
      </li>
    {:else if $state === "Inactive"}
      <li class="action solo">
        <button
          on:click={() => buildMenu.action("Open")}
          data-augmented-ui="all-hex"
          class="action-content">Build</button
        >
      </li>
    {:else if $state === "Building"}
      <li class="action solo">
        <button
          on:click={() => buildMenu.action("Open")}
          data-augmented-ui="all-hex"
          class="action-content">Building...</button
        >
      </li>
    {/if}
  </ul>
</div>

<style>
  ul {
    display: grid;
    list-style-type: none;
    margin: 0;
    padding: 0;
    grid-template-rows: repeat(3, 1fr);
    grid-template-columns: repeat(6, 1fr);
    column-gap: 5px;
    row-gap: 35px;
  }
  .actions {
    position: absolute;
    right: 3rem;
    bottom: 3rem;
  }
  .action {
    display: block;
    transform-origin: 50% 50%;
    transform: scale(2, 2);
    z-index: 1;
  }
  .action:nth-child(1) {
    grid-row-start: 1;
    grid-column-start: 2;
    grid-column-end: 3;
  }
  .action:nth-child(2) {
    grid-row-start: 1;
    grid-column-start: 4;
    grid-column-end: 5;
  }
  .action:nth-child(3) {
    grid-row-start: 2;
    grid-column-start: 1;
    grid-column-end: 2;
  }
  .action:nth-child(4),
  .action.solo {
    grid-row-start: 2;
    grid-column-start: 3;
    grid-column-end: 4;
    z-index: 2;
  }
  .action:nth-child(5) {
    grid-row-start: 2;
    grid-column-start: 5;
    grid-column-end: 6;
  }
  .action:nth-child(6) {
    grid-row-start: 3;
    grid-column-start: 2;
    grid-column-end: 3;
  }
  .action-content {
    --aug-all-width: 45px;
    /*--aug-all-height: 3rem;*/
    --aug-border: initial;
    font-size: 10px;
    cursor: pointer;
    overflow: hidden;
    border: none;
  }
</style>
