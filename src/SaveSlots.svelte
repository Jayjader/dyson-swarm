<script lang="ts">
  import NavButton from "./NavButton.svelte";
  import { getContext, onDestroy, onMount } from "svelte";
  import { APP_UI_CONTEXT, simulationIsLoaded } from "./appStateStore";
  import type { SaveState } from "./events";

  enum Slot {
    AUTO = "auto",
    NAMES = "slots",
    NAME,
  }
  const slotStorageKey = (s: Slot) => {
    switch (s) {
      case Slot.NAMES:
      case Slot.AUTO:
        // this is only a function because I couldn't find a way to make the compiler
        // understand that passing one of these as argument here would guarantee directly
        // being a string
        return () => `save_slots--${s}`;
      case Slot.NAME:
        return (index: number) => `save_slots--${index}`;
    }
  };
  type SaveStub = { name: string };
  type Save = SaveStub & SaveState;
  type SaveStubs = {
    slots: SaveStub[];
    autoSave: null | { name: "AUTOSAVE" };
  };

  let saveStubs: SaveStubs = {
    autoSave: null,
    slots: [],
  };

  function readStubs(): SaveStubs {
    const existingAutosave = window.localStorage.getItem(
      slotStorageKey(Slot.AUTO)()
    );
    // debugger
    const autoSave =
      existingAutosave === null ? null : JSON.parse(existingAutosave);
    const slotNames = window.localStorage.getItem(slotStorageKey(Slot.NAMES)());
    const slots =
      slotNames === null
        ? []
        : [...new Set(JSON.parse(slotNames))].map((name) => ({ name }));
    // console.debug({ autoSave, slots });
    return { autoSave, slots };
  }

  function readStub(name: string): null | Save {
    const data = window.localStorage.getItem(slotStorageKey(Slot.NAME)(name));
    return data === null ? null : (JSON.parse(data) as Save);
  }

  function writeSlotToStorage(save: Save) {
    if (save.name === "AUTOSAVE") {
      window.localStorage.setItem(
        slotStorageKey(Slot.AUTO)(),
        JSON.stringify(save.processors)
      );
    } else {
      window.localStorage.setItem(
        slotStorageKey(Slot.NAME)(save.name),
        JSON.stringify(save.processors)
      );
      const NAMES_KEY = slotStorageKey(Slot.NAMES)();
      const names = window.localStorage.getItem(NAMES_KEY);
      const namesArray = new Set(names === null ? [] : JSON.parse(names));
      namesArray.add(save.name);
      window.localStorage.setItem(NAMES_KEY, JSON.stringify([...namesArray]));
    }
  }

  let slotIndex = -2;
  let inSimulation = false;
  let simulation = null;
  const uiStore = getContext(APP_UI_CONTEXT).uiStore;
  let simSub = null;
  const uiSub = uiStore.subscribe((stack) => {
    inSimulation = simulationIsLoaded(stack);
    if (inSimulation) {
      simSub = stack[1].subscribe((sim) => {
        simulation = sim;
      });
    } else if (simSub !== null) {
      simSub();
      simSub = null;
    }
  });
  onDestroy(() => {
    if (simSub !== null) simSub();
  });
  onDestroy(uiSub);

  const selectSlot = (index: number) => {
    slotIndex = index;
  };

  onMount(() => {
    saveStubs = readStubs();
  });
  $: disabled = slotIndex === -2;
</script>

<main
  style="max-width: 23rem"
  class="m-auto flex flex-col justify-between gap-2 bg-slate-200"
>
  <header class="m-2 flex flex-row justify-between gap-2">
    <nav class="flex flex-col gap-2">
      {#if slotIndex === -2}
        <NavButton
          on:click={inSimulation
            ? uiStore.closeSaveSlots
            : uiStore.closeSaveSlotsInSimulation}
          >Back&nbsp;to {#if inSimulation}Simulation{:else}Title{/if}</NavButton
        >
      {:else}
        <NavButton on:click={selectSlot.bind(this, -2)}>Cancel Choice</NavButton
        >
      {/if}
      {#if inSimulation}
        <NavButton on:click={uiStore.closeSimulation}
          >Close Simulation</NavButton
        >
      {/if}
    </nav>
    <h2>
      {#if slotIndex === -2}Choose a save slot{:else}Choose an action{/if}
    </h2>
  </header>
  <div
    class="m-2 flex flex-row flex-wrap justify-center gap-2 overflow-y-scroll"
  >
    <button
      class:chosen={slotIndex === -1}
      class={"w-full flex-grow rounded-xl border-2 border-slate-900 font-mono" +
        (saveStubs.autoSave !== null ? " bg-stone-400" : "")}
      on:click={selectSlot.bind(this, -1)}
      >{#if saveStubs.autoSave === null}(NO
      {/if}AUTOSAVE{#if saveStubs.autoSave === null}){/if}</button
    >
    <hr class="basis-2/3 rounded border-2 border-slate-900" />
    {#each saveStubs.slots as save, i}
      <button
        class:chosen={slotIndex === i}
        class="w-full flex-grow flex-grow rounded-xl border-2 border-slate-900 bg-stone-400"
        on:click={selectSlot.bind(this, i)}>{save.name}</button
      >
    {/each}
    <button
      class:chosen={slotIndex === saveStubs.slots.length}
      class="w-full flex-grow flex-grow rounded-xl border-2 border-slate-900"
      on:click={selectSlot.bind(this, saveStubs.slots.length)}
      >(New Slot)</button
    >
  </div>
  <div class="m-2 grid grid-cols-3 grid-rows-2 gap-2">
    {#if inSimulation}
      <button
        class="rounded border-2 border-slate-900 disabled:border-dashed"
        {disabled}
        on:click={() => {
          const name = "a test save -=#=- " + String(Math.random());
          writeSlotToStorage({
            name,
            processors: simulation.processors,
          });
          saveStubs.slots.push({ name });
          slotIndex = -2;
        }}>Save</button
      >
    {:else}
      <div>
        <!--empty div to preserve how the grid auto-places the remaining buttons in a quick and dirty way-->
      </div>
    {/if}
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      {disabled}>Import</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      {disabled}>Delete</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      {disabled}>Load</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      {disabled}>Export</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      {disabled}>Clone</button
    >
  </div>
</main>

<style>
  main {
    min-height: 30dvh;
    height: calc(100dvh - 2.5em);
    max-height: calc(100dvh - 2.5em);
  }
  button {
    min-height: 4rem;
  }
  button.chosen {
    box-shadow: inset 0 0 0.75rem 0.5rem #0f172a /*slate-900*/;
  }
</style>
