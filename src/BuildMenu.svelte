<script lang="ts">
  import { createFsm, state as fsmState } from "./fsmStore";
  import { build } from "./actions";
  import type { BuildChoice, Buildings, GameAction } from "./types";
  import type { TransitionConfig } from "svelte/transition";

  type BuildMenuStates = "Inactive" | "Manual" | "Auto" | "Building";

  export let dispatch: (action: GameAction) => void;
  export let autoBuildChoice: BuildChoice = null;

  const buildMenu = createFsm(`
  Inactive 'Open' => Manual;
  Manual 'Build' -> Manual;
  Manual 'Auto' => Auto 'Manual' => Manual;
  [ Manual Auto ] 'Nothing' -> Inactive;
  Auto 'Choose' => Building 'Open' => Auto;
  `);
  const state = fsmState<BuildMenuStates>(buildMenu);

  $: manualBuild = (building: keyof Buildings) => {
    dispatch(build[building]);
    buildMenu.action("Build");
  };
  $: chooseAutoBuild = (building: keyof Buildings) => {
    autoBuildChoice = building;
    buildMenu.action("Choose");
  };
  $: buildAction = (building: keyof Buildings, mode: BuildMenuStates) =>
    ({
      Inactive: undefined,
      Building: undefined,
      Manual: manualBuild,
      Auto: chooseAutoBuild,
    }[mode](building));

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

<div class="actions" class:auto={$state === "Auto" || $state === "Building"}>
  <ul>
    {#if $state === "Inactive"}
      <li class="action solo">
        <button
          on:click={() => buildMenu.action("Open")}
          data-augmented-ui="all-hex"
          class="action-content">Build</button
        >
      </li>
    {:else if $state === "Manual"}
      <li class="action" transition:pivot={{ corner: "D" }}>
        <button
          on:click={() => buildAction("solarCollector", $state)}
          data-augmented-ui="all-hex"
          class="action-content"
        >
          Collector
        </button>
      </li>
      <li class="action" transition:pivot={{ corner: "F" }}>
        <button
          on:click={() => manualBuild("miner")}
          data-augmented-ui="all-hex"
          class="action-content">Miner</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "C" }}>
        <button
          on:click={() => manualBuild("refiner")}
          data-augmented-ui="all-hex"
          class="action-content">Refiner</button
        >
      </li>
      <li class="action">
        <button
          on:click={() => buildMenu.action("Nothing")}
          data-augmented-ui="all-hex"
          class="action-content">Nothing</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "E" }}>
        <button
          on:click={() => manualBuild("satelliteFactory")}
          data-augmented-ui="all-hex"
          class="action-content">Sat. Factory</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "B" }}>
        <button
          on:click={() => manualBuild("satelliteLauncher")}
          data-augmented-ui="all-hex"
          class="action-content"
        >
          Sat. Launcher</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "A" }}>
        <button
          on:click={() => buildMenu.action("Auto")}
          data-augmented-ui="all-hex"
          class="action-content"
        >
          Auto</button
        >
      </li>
    {:else if $state === "Auto"}
      <li class="action" transition:pivot={{ corner: "D" }}>
        <button
          on:click={() => chooseAutoBuild("solarCollector")}
          data-augmented-ui="all-hex"
          class="action-content"
        >
          Collector
        </button>
      </li>
      <li class="action" transition:pivot={{ corner: "F" }}>
        <button
          on:click={() => chooseAutoBuild("miner")}
          data-augmented-ui="all-hex"
          class="action-content">Miner</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "C" }}>
        <button
          on:click={() => chooseAutoBuild("refiner")}
          data-augmented-ui="all-hex"
          class="action-content">Refiner</button
        >
      </li>
      <li class="action">
        <button
          on:click={() => buildMenu.action("Nothing")}
          data-augmented-ui="all-hex"
          class="action-content">Nothing</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "E" }}>
        <button
          on:click={() => chooseAutoBuild("satelliteFactory")}
          data-augmented-ui="all-hex"
          class="action-content">Sat. Factory</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "B" }}>
        <button
          on:click={() => chooseAutoBuild("satelliteLauncher")}
          data-augmented-ui="all-hex"
          class="action-content"
        >
          Sat. Launcher</button
        >
      </li>
      <li class="action" transition:pivot={{ corner: "A" }}>
        <button
          on:click={() => buildMenu.action("Manual")}
          data-augmented-ui="all-hex"
          class="action-content"
        >
          Manual</button
        >
      </li>
    {:else if $state === "Building"}
      <li class="action solo">
        <button
          on:click={() => buildMenu.action("Open")}
          data-augmented-ui="all-hex"
          class="action-content">Building {autoBuildChoice}</button
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
  .auto button {
    --aug-border-bg: purple;
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
  .action:nth-child(7) {
    grid-row-start: 3;
    grid-column-start: 4;
    grid-column-end: 5;
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
