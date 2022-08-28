<script lang="ts">
  export let contents: Array<[string, number]>;
  export let caption: string;
  export let orientation: "right" | "left" = "right";
  let old: null | [string, number][] = null;
  const diff = new Map();
  $: {
    const localContents = [...contents];
    if (old !== null) {
      // calculate new diff
      old.forEach(([key, value], index) =>
        diff.set(key, localContents[index][1] - value)
      );
    }
    // store new as old for next change
    old = localContents;
  }

  const augUiMixins =
    orientation === "right"
      ? "tl-2-clip-x tr-2-clip-y bl-2-clip-x"
      : "tr-2-clip-x tl-2-clip-y br-2-clip-x";
</script>

<div
  class="panel my-4 mx-0 pb-9 bg-purple-300"
  class:left={orientation === "left"}
  class:right={orientation === "right"}
  data-augmented-ui={augUiMixins}
>
  <table>
    <caption class="capitalize font-bold">{caption}</caption>
    {#each contents as [name, count] (name)}
      <tr
        ><th>{name}</th><td>{count}</td>
        <td class="diff">
          {diff.get(name)
            ? diff.get(name) > 0
              ? `+${diff.get(name)}`
              : diff.get(name)
            : ""}
        </td>
      </tr>
    {/each}
  </table>
</div>

<style>
  .panel {
    grid-area: PanelLeft;
  }

  .left {
    grid-area: PanelLeft;
  }
  .right {
    grid-area: PanelRight;
  }

  table {
    border-collapse: collapse;
    width: 95%;
    margin: auto;
  }

  caption {
    color: purple;
  }

  tr > * {
    border-bottom: 1px solid black;
  }

  th {
    text-align: left;
    text-transform: capitalize;
  }

  td {
    text-align: right;
  }

  td:nth-child(n + 1) {
    min-width: 5rem;
  }

  td.diff {
    border: none;
    text-align: left;
  }
</style>
