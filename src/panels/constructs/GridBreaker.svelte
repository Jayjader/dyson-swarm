<script lang="ts">
  import { gridState } from "../../events/processes/powerGrid";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE } from "../../events";
  import { getClock } from "../../events/processes/clock";
  import { getPrimitive } from "../../hud/types";
  import type { BusEvent } from "../../events/events";

  let tripped = false,
    lastTick = 0;
  const simulation = getContext(SIMULATION_STORE).simulation;
  const unsubSim = simulation.subscribe((sim) => {
    tripped = gridState(sim).breakerTripped;
    lastTick = getPrimitive(getClock(sim)).tick;
  });
  onDestroy(unsubSim);

  const toggleBreaker = () => {
    const timeStamp = performance.now();
    const toggleEvent: BusEvent = tripped
      ? {
          tag: "command-reset-circuit-breaker",
          afterTick: lastTick,
          timeStamp,
        }
      : { tag: "command-trip-circuit-breaker", afterTick: lastTick, timeStamp };
    console.info({ toggleEvent });
    simulation.broadcastEvent(toggleEvent);
  };

  $: border = tripped ? "border-red-400" : "border-blue-400";
  $: text = tripped ? `text-red-400` : "text-blue-400";
</script>

<label
  class="basis-full rounded-xl border-8 {border} flex flex-col items-stretch justify-center pt-1 pb-2 text-center {text} cursor-pointer"
>
  Power Grid
  <input
    type="checkbox"
    checked={tripped}
    on:change={toggleBreaker}
    class="cursor-pointer"
  />
  Circuit Breaker
</label>

<style>
  input::before,
  input::after {
    /* see https://css-tricks.com/fun-times-styling-checkbox-states/ */
  }
</style>
