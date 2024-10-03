<script lang="ts">
  import { getGridState } from "../../events/processes/powerGrid";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE, type SimulationStore } from "../../events";
  import type { BusEvent } from "../../events/events";
  import { type ClockStore } from "../../simulation/clockStore";

  let lastTick = Number.NEGATIVE_INFINITY;
  let tripped = false;
  export let clockStore: ClockStore;
  const { simulation } = getContext(SIMULATION_STORE) as {
    simulation: SimulationStore;
  };
  const unsubscribeFromClock = clockStore.subscribe(async ({ tick }) => {
    lastTick = tick;
    tripped = (await getGridState(simulation.adapters)).breakerTripped;
  });
  onDestroy(unsubscribeFromClock);

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
  class="basis-full rounded-xl border-8 {border} flex flex-col items-stretch justify-center pb-2 pt-1 text-center {text} cursor-pointer"
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
