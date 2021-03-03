<script lang="ts">
  export let tripped: boolean;
</script>

<div data-augmented-ui="">
  <label>
    Circuit Breaker
    <input type="checkbox" bind:checked={tripped} on:change />
  </label>
</div>

<style>
  label {
    border: 1px solid black;
    position: relative;
    margin: 0 auto;
    cursor: pointer;
    max-width: fit-content;
    padding: 5px;
  }

  input {
    position: absolute;
    top: 50%;
    left: 50%;
  }
</style>
