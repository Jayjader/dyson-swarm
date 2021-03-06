<script lang="ts">
  export let tripped: boolean;
</script>

<div
  class="circuit-breaker"
  data-augmented-ui="tl-clip tr-clip bl-clip br-clip"
>
  <label data-augmented-ui-inlay class:tripped>
    Circuit Breaker
    <input type="checkbox" hidden bind:checked={tripped} on:change />
    {tripped ? "(tripped)" : ""}
  </label>
</div>

<style>
  .circuit-breaker {
    --aug-border: initial;
    --aug-border-all: 1px;
    --aug-border-bg: black;

    --aug-inlay: initial;
    --aug-delegated-inlay: initial;
    --aug-inlay-bg: green;

    max-width: min-content;
    margin: 0 auto;
  }

  .circuit-breaker .tripped {
    --aug-inlay-bg: red;
  }

  label {
    position: relative;
    cursor: pointer;
    padding: 10px;
  }

  input {
    position: absolute;
    top: 50%;
    left: 50%;
  }
</style>
