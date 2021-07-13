<!-- @component Launch a packaged satellite into orbit -->
<button
  class="satellite-launch-control"
  data-augmented-ui="tl-clip br-clip"
  on:click
>
  Launch Satellite
</button>

<style>
  .satellite-launch-control {
    --aug-border: initial;
    --aug-border-all: 1px;
    --aug-border-bg: blue;

    --aug-inlay: initial;
    --aug-inlay-bg: black;

    padding: 2ch;
    border: none;

    color: white;

    cursor: pointer;
  }
</style>
