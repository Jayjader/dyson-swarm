<script lang="ts">
  import { createFsm, state as fsmState } from "./fsmStore";
  import type { BuildChoice } from "./types";
  import { Building } from "./types";
  import type { TransitionConfig } from "svelte/transition";
  import Tile from "./Tile.svelte";
  import { buildQueue, store as fabricator } from "./store/fabricator";

  type BuildMenuStates = "Inactive" | "Manual" | "Auto" | "Building";

  const buildMenu = createFsm(`
  Inactive 'Open' => Manual;
  Manual 'Build' -> Manual;
  Manual 'Auto' => Auto 'Manual' => Manual;
  [ Manual Auto ] 'Nothing' -> Inactive;
  Auto 'Choose' => Building 'Open' => Auto;
  `);
  const state = fsmState<BuildMenuStates>(buildMenu);

  function manualBuild(building: Building) {
    buildQueue.push({ building });
    buildMenu.action("Build");
  }
  function chooseAutoBuild(building: Building) {
    buildQueue.push({ building, auto: true });
    buildMenu.action("Choose");
  }
  function clearAutoBuild() {
    buildQueue.clear({ onlyAuto: true });
    buildMenu.action("Nothing");
  }

  /*    1
   *  2/|\6
   * --|.|-- "." <=> origin
   *  3\|/5
   *    4
   * */
  const corners = {
    1: { x: 0, y: 1 },
    2: { x: -Math.sqrt(3) / 2, y: 1 / 2 },
    3: { x: -Math.sqrt(3) / 2, y: -1 / 2 },
    4: { x: 0, y: -1 },
    5: { x: Math.sqrt(3) / 2, y: -1 / 2 },
    6: { x: Math.sqrt(3) / 2, y: 1 / 2 },
  };
  function cornerForIndex(index: number): 1 | 2 | 3 | 4 | 5 | 6 {
    /*
      1 => 4
      2 => 5
      3 => 6
      4 => 1
      5 => 2
      6 => 3
     */
    return (((index + 2) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
  }

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

  function menuItems(
    state: BuildMenuStates,
    sm: ReturnType<typeof createFsm>,
    currentlyBuilding: BuildChoice
  ): Array<{ label: string; action: () => void }> {
    switch (state) {
      case "Inactive":
        return [{ label: "Build", action: () => sm.action("Open") }];
      case "Manual":
        return [
          { label: "Nothing", action: () => sm.action("Nothing") },
          {
            label: "Collector",
            action: () => manualBuild(Building.SOLAR_COLLECTOR),
          },
          { label: "Miner", action: () => manualBuild(Building.MINER) },
          { label: "Refiner", action: () => manualBuild(Building.REFINERY) },
          {
            label: "Sat. Factory",
            action: () => manualBuild(Building.SATELLITE_FACTORY),
          },
          {
            label: "Sat. Launcher",
            action: () => manualBuild(Building.SATELLITE_LAUNCHER),
          },
          { label: "Auto", action: () => sm.action("Auto") },
        ];
      case "Auto":
        return [
          {
            label: "Nothing",
            action: () => clearAutoBuild(),
          },
          {
            label: "Collector",
            action: () => chooseAutoBuild(Building.SOLAR_COLLECTOR),
          },
          { label: "Miner", action: () => chooseAutoBuild(Building.MINER) },
          {
            label: "Refiner",
            action: () => chooseAutoBuild(Building.REFINERY),
          },
          {
            label: "Sat. Factory",
            action: () => chooseAutoBuild(Building.SATELLITE_FACTORY),
          },
          {
            label: "Sat. Launcher",
            action: () => chooseAutoBuild(Building.SATELLITE_LAUNCHER),
          },
          {
            label: "Manual",
            action: () => sm.action("Manual"),
          },
        ];
      case "Building":
        return [
          {
            label: `Building ${currentlyBuilding}`,
            action: () => {
              sm.action("Open");
            },
          },
        ];
    }
  }

  $: items = menuItems($state, buildMenu, $fabricator.auto);
</script>

<div class="actions" class:auto={$state === "Auto" || $state === "Building"}>
  <ul>
    {#each items as item, index (index)}
      {#if index === 0}
        <li class="center">
          <Tile on:click={item.action}>{item.label}</Tile>
        </li>
      {:else}
        <li transition:pivot={{ corner: cornerForIndex(index) }}>
          <Tile on:click={item.action}>{item.label}</Tile>
        </li>
      {/if}
    {/each}
  </ul>
</div>

<style>
  ul {
    display: grid;
    list-style-type: none;
    margin: 2em auto;
    padding: 0;
    width: 295px;
    height: 225px;
    grid-template-rows: repeat(3, 1fr);
    grid-template-columns: repeat(6, 1fr);
    column-gap: 5px;
    row-gap: 35px;
  }
  .auto :global(button) {
    --aug-border-bg: purple;
  }
  .actions {
    position: static;
    grid-area: BuildMenu;
  }
  li {
    display: block;
    transform-origin: 50% 50%;
    transform: scale(2, 2);
    z-index: 1;
  }
  li.center {
    grid-row-start: 2;
    grid-column: 3/5;
    z-index: 2;
  }
  li:nth-child(2) {
    grid-row-start: 1;
    grid-column: 2/4;
  }
  li:nth-child(3) {
    grid-row-start: 1;
    grid-column: 4/6;
  }
  li:nth-child(4) {
    grid-row-start: 2;
    grid-column: 5/7;
  }
  li:nth-child(5) {
    grid-row-start: 3;
    grid-column: 4/6;
  }
  li:nth-child(6) {
    grid-row-start: 3;
    grid-column: 2/4;
  }
  li:nth-child(7) {
    grid-row-start: 2;
    grid-column: 1/3;
  }
</style>
