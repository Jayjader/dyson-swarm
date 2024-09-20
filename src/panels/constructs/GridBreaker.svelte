<script lang="ts">
  import { getGridState } from "../../events/processes/powerGrid";
  import { getContext, onDestroy } from "svelte";
  import { SIMULATION_STORE, type SimulationStore } from "../../events";
  import { getClock } from "../../events/processes/clock";
  import { getPrimitive } from "../../hud/types";
  import type { BusEvent } from "../../events/events";

  let tripped = false,
    lastTick = 0;
  const simulation = getContext(SIMULATION_STORE).simulation as SimulationStore;
  const unsubSim = simulation.subscribe(async (sim) => {
    tripped = (await getGridState(simulation.adapters)).breakerTripped;
    lastTick = getPrimitive(await getClock(simulation.adapters)).tick;
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
