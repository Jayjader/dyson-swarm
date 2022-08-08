<!-- @component Launch a packaged satellite into orbit -->
<script lang="ts">
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  export let visible: boolean;
  export let disabled: boolean;
  export let value: number;
  export let max: number;
  export let auto: boolean;
  const tweenedValue = tweened(0, {
    easing: cubicOut,
    interpolate: (from, to) => (t) => from + Math.floor(t * (to - from)),
  });
  $: tweenedValue.set(value);
</script>

<!-- self flag on button click so we don't launch a satellite when the user toggles "launch when ready" flag -->
<button
  class="satellite-launch-control"
  data-augmented-ui="tl-clip br-clip"
  on:click|self
  style="visibility: {visible ? 'visible' : 'hidden'}"
  {disabled}
>
  <label>Launch When Ready<input type="checkbox" bind:checked={auto} /></label>
  Launch Satellite
  <label
    style="visibility: {visible && $tweenedValue / max !== 1
      ? 'visible'
      : 'hidden'}"
    >Electricity satisfaction:
    <progress
      class="elec"
      {max}
      value={$tweenedValue}
      title={value < max ? "Not enough electricity" : null}
      >{Math.min(Math.floor((value / max) * 100), 100)}%</progress
    ></label
  >
</button>

<style>
  .satellite-launch-control {
    --aug-inlay: initial;
    --aug-inlay-bg: black;

    padding: 4ch 2ch;
    border: none;

    color: white;

    cursor: pointer;
    position: relative;
    transition: visibility 330ms ease-in;
  }
  :disabled {
    --aug-inlay-bg: darkgrey;
    color: gray;
    cursor: not-allowed;
  }
  progress {
    position: absolute;
    bottom: 0.5rem;
    left: 15%;
    width: 70%;
  }
</style>
