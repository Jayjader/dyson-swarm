<script lang="ts">
  export let paused: boolean = false;
</script>

<div class="worker-toggle" data-augmented-ui="tr-clip bl-clip">
  <label data-augmented-ui-inlay class:paused>
    <slot />
    <input type="checkbox" hidden checked={paused} on:change />
  </label>
</div>

<style>
  .worker-toggle {
    --aug-border: initial;
    --aug-border-all: 1px;
    --aug-border-bg: black;

    --aug-inlay: initial;
    --aug-delegated-inlay: initial;
    --aug-inlay-bg: white;

    max-width: min-content;
    margin: 0 auto;
  }

  .worker-toggle :hover {
    --aug-inlay-bg: lightgrey;
  }

  .worker-toggle .paused {
    --aug-inlay-bg: grey;
  }

  label {
    position: relative;
    cursor: pointer;
    padding: 10px;
    min-width: 14ch;
  }
</style>
