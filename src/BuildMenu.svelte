<script lang="ts">
  import { createFsm, state as fsmState } from "./fsmStore";
  import { build } from "./actions";
  import type { BuildChoice, Buildings, GameAction } from "./types";
  import type { TransitionConfig } from "svelte/transition";
  import Tile from "./Tile.svelte";

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

  /*   A
   *  B/|\F
   * --|.|-- "." <=> origin
   *  C\|/E
   *    D
   * */
  const corners = {
    A: { x: 0, y: 1 },
    B: { x: Math.sqrt(3) / 2, y: 1 / 2 },
    C: { x: Math.sqrt(3) / 2, y: -1 / 2 },
    D: { x: 0, y: -1 },
    E: { x: -Math.sqrt(3) / 2, y: -1 / 2 },
    F: { x: -Math.sqrt(3) / 2, y: 1 / 2 },
  };

  function pivot(
    _node,
    { corner, angle = (2 * Math.PI) / 3, width = 45, duration = 220 }
  ): TransitionConfig {
    // multiplying by 9/7 places the center of rotation at about the center of the gap between tiles
    const x = (corners[corner].x * width * 9) / 7;
    const y = (corners[corner].y * width * 9) / 7;
    const changeOrigin = `translate(${-x}px, ${-y}px)`;
    const changeBack = `translate(${x}px, ${y}px)`;
    return {
      duration,
      css: (_t, u) =>
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
        <Tile on:click={() => buildMenu.action("Open")}>Build</Tile>
      </li>
    {:else if $state === "Manual"}
      <li class="action" transition:pivot={{ corner: "D" }}>
        <Tile on:click={() => manualBuild("solarCollector")}>Collector</Tile>
      </li>
      <li class="action" transition:pivot={{ corner: "C" }}>
        <Tile on:click={() => manualBuild("miner")}>Miner</Tile>
      </li>
      <li class="action" transition:pivot={{ corner: "E" }}>
        <Tile on:click={() => manualBuild("refiner")}>Refiner</Tile>
      </li>
      <li class="action">
        <Tile on:click={() => buildMenu.action("Nothing")}>Nothing</Tile>
      </li>
      <li class="action" transition:pivot={{ corner: "B" }}>
        <Tile on:click={() => manualBuild("satelliteFactory")}
          >Sat. Factory</Tile
        >
      </li>
      <li class="action" transition:pivot={{ corner: "F" }}>
        <Tile on:click={() => manualBuild("satelliteLauncher")}>
          Sat. Launcher</Tile
        >
      </li>
      <li class="action" transition:pivot={{ corner: "A" }}>
        <Tile on:click={() => buildMenu.action("Auto")}>Auto</Tile>
      </li>
    {:else if $state === "Auto"}
      <li class="action" transition:pivot={{ corner: "D" }}>
        <Tile on:click={() => chooseAutoBuild("solarCollector")}>
          Collector
        </Tile>
      </li>
      <li class="action" transition:pivot={{ corner: "C" }}>
        <Tile on:click={() => chooseAutoBuild("miner")}>Miner</Tile>
      </li>
      <li class="action" transition:pivot={{ corner: "E" }}>
        <Tile on:click={() => chooseAutoBuild("refiner")}>Refiner</Tile>
      </li>
      <li class="action">
        <Tile on:click={() => buildMenu.action("Nothing")}>Nothing</Tile>
      </li>
      <li class="action" transition:pivot={{ corner: "B" }}>
        <Tile on:click={() => chooseAutoBuild("satelliteFactory")}
          >Sat. Factory</Tile
        >
      </li>
      <li class="action" transition:pivot={{ corner: "F" }}>
        <Tile on:click={() => chooseAutoBuild("satelliteLauncher")}>
          Sat. Launcher</Tile
        >
      </li>
      <li class="action" transition:pivot={{ corner: "A" }}>
        <Tile on:click={() => buildMenu.action("Manual")}>Manual</Tile>
      </li>
    {:else if $state === "Building"}
      <li class="action solo">
        <Tile
          on:click={() => {
            autoBuildChoice = null;
            buildMenu.action("Open");
          }}>Building {autoBuildChoice}</Tile
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
  .auto :global(button) {
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
    grid-column: 2/3;
  }
  .action:nth-child(2) {
    grid-row-start: 1;
    grid-column: 4/5;
  }
  .action:nth-child(3) {
    grid-row-start: 2;
    grid-column: 1/2;
  }
  .action:nth-child(4),
  .action.solo {
    grid-row-start: 2;
    grid-column: 3/4;
    z-index: 2;
  }
  .action:nth-child(5) {
    grid-row-start: 2;
    grid-column: 5/6;
  }
  .action:nth-child(6) {
    grid-row-start: 3;
    grid-column: 2/3;
  }
  .action:nth-child(7) {
    grid-row-start: 3;
    grid-column: 4/5;
  }
</style>
