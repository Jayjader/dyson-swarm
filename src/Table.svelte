<script lang="ts">
  export let contents: ArrayLike<[string, number]>;
  export let caption: string;
  export let orientation: "right" | "left" = "right";

  const augUiMixins =
    orientation === "right"
      ? "tl-2-clip-x tr-2-clip-y bl-2-clip-x"
      : "tr-2-clip-x tl-2-clip-y br-2-clip-x";
</script>

<div class={`panel ${orientation}`} data-augmented-ui={augUiMixins}>
  <table>
    <caption>{caption}</caption>
    {#each contents as [name, count]}
      <tr><th>{name}</th><td>{count}</td></tr>
    {/each}
  </table>
</div>

<style>
  .panel {
    margin: 1rem 0;
    padding-bottom: 35px;
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
    text-transform: capitalize;
    color: purple;
    font-weight: bold;
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
</style>
