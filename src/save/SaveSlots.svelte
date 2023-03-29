<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import { APP_UI_CONTEXT, simulationIsLoaded } from "../appStateStore";
  import NavButton from "../NavButton.svelte";
  import type { SaveStubs } from "./uiStore";
  import { uiStore } from "./uiStore";
  import Delete from "./dialog/Delete.svelte";
  import Save from "./dialog/Save.svelte";
  import Load from "./dialog/Load.svelte";
  import Import from "./dialog/Import.svelte";
  import Export from "./dialog/Export.svelte";
  import Clone from "./dialog/Clone.svelte";

  let saveStubs: SaveStubs = {
    autoSave: null,
    slots: [],
  };
  let selected = { index: -2, name: undefined } as {
    index: number;
    name?: string;
  };
  let dialog;

  const uiSub = uiStore.subscribe((stack) => {
    saveStubs = stack[0];
    const index = stack?.[1] ?? -2;
    const name = index === -1 ? "AUTOSAVE" : saveStubs.slots[index]?.name;
    selected = { index, name };
    const dialogState = stack?.[2];
    if (
      dialogState === undefined &&
      (dialog === "clone" ||
        dialog === "delete" ||
        dialog === "save" ||
        dialog === "import")
    ) {
      uiStore.updateStubs(window.localStorage);
    }
    dialog = dialogState;
  });

  let inSimulation = false;
  let simulation = null;
  const appUiStore = getContext(APP_UI_CONTEXT).uiStore;
  let simSub = null;
  const appUiSub = appUiStore.subscribe((stack) => {
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
  onDestroy(appUiSub);
  onDestroy(uiSub);

  onMount(() => {
    uiStore.updateStubs(window.localStorage);
  });
  $: allDisabled = selected.index === -2;
  $: slotIsEmpty =
    selected.index === saveStubs.slots.length ||
    (selected.index === -1 && saveStubs.autoSave === null);
  $: overWriteDisabled = selected.index === -1;

  $: saveNamePattern =
    "^" +
    (saveStubs.slots.length > 0
      ? "(?!" + saveStubs.slots.map((slot) => slot.name).join(")|(?!") + ")"
      : "") +
    ".+$";
</script>

<main
  style="max-width: 23rem"
  class="m-auto flex flex-col justify-between gap-2 bg-slate-200 p-2"
>
  <header class="m-2 flex flex-row justify-between gap-2">
    <nav class="flex flex-col gap-2">
      {#if selected.index === -2}
        <NavButton
          on:click={inSimulation
            ? appUiStore.closeSaveSlotsInSimulation
            : appUiStore.closeSaveSlots}
          >Back&nbsp;to {#if inSimulation}Menu{:else}Title{/if}</NavButton
        >
      {:else}
        <NavButton on:click={uiStore.unselectChosenSlot}
          >Cancel Choice</NavButton
        >
      {/if}
    </nav>
    <h2>
      {#if selected.index === -2}Choose a save slot{:else}Choose an action{/if}
    </h2>
  </header>
  <div
    class="m-2 flex flex-row flex-wrap justify-center gap-2 overflow-y-scroll"
  >
    <button
      class:chosen={selected.index === -1}
      class={"w-full flex-grow rounded-xl border-2 border-slate-900 font-mono" +
        (saveStubs.autoSave !== null ? " bg-stone-400" : "")}
      on:click={uiStore.chooseSlot.bind(this, -1)}
      >{#if saveStubs.autoSave === null}(NO
      {/if}AUTOSAVE{#if saveStubs.autoSave === null}){/if}</button
    >
    <hr class="basis-2/3 rounded border-2 border-slate-900" />
    {#each saveStubs.slots as save, i}
      <button
        class:chosen={selected.index === i}
        class="w-full flex-grow flex-grow rounded-xl border-2 border-slate-900 bg-stone-400"
        on:click={uiStore.chooseSlot.bind(this, i)}>{save.name}</button
      >
    {/each}
    <button
      class:chosen={selected.index === saveStubs.slots.length}
      class="w-full flex-grow flex-grow rounded-xl border-2 border-slate-900"
      on:click={uiStore.chooseSlot.bind(this, saveStubs.slots.length)}
      >(New Slot)</button
    >
  </div>
  <div class="m-2 grid grid-cols-3 grid-rows-2 gap-2">
    {#if inSimulation}
      <button
        class="rounded border-2 border-slate-900 disabled:border-dashed"
        disabled={allDisabled || overWriteDisabled}
        on:click={uiStore.startAction.bind(this, "save")}>Save</button
      >
    {:else}
      <div>
        <!--empty div to preserve how the grid auto-places the remaining buttons in a quick and dirty way-->
      </div>
    {/if}
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || overWriteDisabled}
      on:click={uiStore.startAction.bind(this, "import")}
    >
      Import</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}
      on:click={uiStore.startAction.bind(this, "delete")}>Delete</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}
      on:click={uiStore.startAction.bind(this, "load")}>Load</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}
      on:click={uiStore.startAction.bind(this, "export")}
    >
      Export</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}
      on:click={uiStore.startAction.bind(this, "clone")}>Clone</button
    >
  </div>
  {#if dialog === "delete"}
    <Delete name={selected.name} on:close={uiStore.endAction} />
  {:else if dialog === "save"}
    <Save
      simulationState={simulation}
      overWrittenName={selected.name}
      saveNames={saveStubs.slots.map((slot) => slot.name)}
      on:close={uiStore.endAction}
    />
  {:else if dialog === "load"}
    <Load
      name={selected.name}
      {inSimulation}
      on:close={(event) => {
        const saveState = event.detail.saveState;
        if (saveState !== undefined) {
          (inSimulation
            ? appUiStore.replaceRunningSimulation
            : appUiStore.startSimulation)(saveState);
        }
        uiStore.endAction();
      }}
    />
  {:else if dialog === "import"}
    <Import overWrittenName={selected.name} on:close={uiStore.endAction} />
  {:else if dialog === "export"}
    <Export saveName={selected.name} on:close={uiStore.endAction} />
  {:else if dialog === "clone"}
    <Clone clonedSaveName={selected.name} on:close={uiStore.endAction} />
  {/if}
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
