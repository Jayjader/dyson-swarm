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
    const autoSave =
      existingAutosave === null ? null : JSON.parse(existingAutosave);
    const slotNames = window.localStorage.getItem(slotStorageKey(Slot.NAMES)());
    const slots =
      slotNames === null
        ? []
        : [...new Set(JSON.parse(slotNames))].map((name) => ({ name }));
    return { autoSave, slots };
  }

  function readSave(name: string): null | SaveState {
    const data = window.localStorage.getItem(slotStorageKey(Slot.NAME)(name));
    return data === null
      ? null
      : { processors: JSON.parse(data) as Save["processors"] };
  }

  function writeSlotToStorage(save: Save) {
    const formattedSave = JSON.stringify([...save.processors.values()]);
    const saveKey = slotStorageKey(
      save.name === "AUTOSAVE" ? Slot.AUTO : Slot.NAME
    )(save.name);
    window.localStorage.setItem(saveKey, formattedSave);
    if (save.name !== "AUTOSAVE") {
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
  $: allDisabled = slotIndex === -2;
  $: slotIsEmpty =
    slotIndex === saveStubs.slots.length ||
    (slotIndex === -1 && saveStubs.autoSave === null);
  $: overWriteDisabled = slotIndex === -1;

  let dialog = { state: "closed" } as
    | { state: "closed" }
    | { state: "warn-overwrite-on-save" }
    | { state: "warn-overwrite-on-import" }
    | { state: "warn-discard-on-load" }
    | { state: "save" }
    | { state: "import" }
    | { state: "export" }
    | { state: "delete" };
  const dialogAfterConfirm: Record<
    Exclude<typeof dialog["state"], "closed">,
    typeof dialog["state"]
  > = {
    "warn-overwrite-on-save": "save",
    "warn-overwrite-on-import": "import",
    "warn-discard-on-load": "closed",
    import: "closed",
    save: "closed",
    export: "closed",
    delete: "closed",
  };
  const dialogContent = {
    "warn-overwrite-on-import": {
      text: "This will overwrite the existing simulation data in this save slot. Overwrite old data with new?",
      confirmText: "Overwrite",
    },
    "warn-overwrite-on-save": {
      text: "This will overwrite the existing simulation data in this save slot. Overwrite old data with new?",
      confirmText: "Overwrite",
    },
    "warn-discard-on-load": {
      text: "This will discard any unsaved data from the current simulation. Discard unsaved data?",
      confirmText: "Discard",
    },
    delete: {
      text: "This will delete the existing simulation data in this save slot. Delete saved data?",
      confirmText: "Overwrite",
    },
    export: { label: "File name", confirmText: "Export" },
    import: { label: "Pick file", confirmText: "Import" },
    save: { label: "Save name", confirmText: "Save" },
  };
  let dialogElement;
  $: {
    console.debug({ dialog });
    switch (dialog.state) {
      case "closed":
        break;
      case "warn-overwrite-on-import":
      case "warn-overwrite-on-save":
      case "save":
      case "warn-discard-on-load":
        dialogElement.showModal();
        break;
      case "import":
        break;
      case "export":
        break;
      case "delete":
        break;
    }
  }
  $: saveNamePattern =
    "^" +
    (saveStubs.slots.length > 0
      ? "(?!" + saveStubs.slots.map((slot) => slot.name).join(")|(?!") + ")"
      : "") +
    ".+$";

  function loadSave(name: string) {
    const saveState = readSave(name);
    if (saveState === null) {
      /*todo: error dialog*/
      return;
    }
    if (inSimulation) {
      uiStore.replaceRunningSimulation(saveState);
    } else {
      uiStore.startSimulation(saveState);
    }
  }
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
        disabled={allDisabled || overWriteDisabled}
        on:click={() => {
          dialog =
            saveStubs.slots.at(slotIndex) !== undefined
              ? {
                  state: "warn-overwrite-on-save",
                }
              : { state: "save" };
        }}>Save</button
      >
    {:else}
      <div>
        <!--empty div to preserve how the grid auto-places the remaining buttons in a quick and dirty way-->
      </div>
    {/if}
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || overWriteDisabled}>Import</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}>Delete</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}
      on:click={() => {
        if (inSimulation) {
          dialog = { state: "warn-discard-on-load" };
        } else {
          loadSave(
            slotIndex === -1 ? "AUTOSAVE" : saveStubs.slots[slotIndex].name
          );
          dialog = { state: "closed" };
        }
      }}>Load</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}>Export</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}>Clone</button
    >
  </div>
  <dialog
    class="rounded border-2 border-slate-900"
    bind:this={dialogElement}
    on:close={(closeEvent) => {
      const playerCommand = closeEvent.target.returnValue;
      if (playerCommand === "cancel") {
        dialog = { state: "closed" };
      } else {
        console.debug({ closeEvent, playerCommand });
        if (dialog.state === "save") {
          const name = closeEvent.target.firstChild.elements["saveName"].value;
          writeSlotToStorage({ name, processors: simulation.processors });
          saveStubs = readStubs();
          slotIndex = -2;
        } else if (dialog.state === "warn-discard-on-load") {
          loadSave(
            slotIndex === -1 ? "AUTOSAVE" : saveStubs.slots[slotIndex].name
          );
        }
        dialog = { state: dialogAfterConfirm[dialog.state] };
      }
    }}
  >
    <form method="dialog">
      {#if dialog.state !== "closed"}
        {#if dialogContent[dialog.state].text}
          <p>{dialogContent[dialog.state].text}</p>
        {:else if dialogContent[dialog.state].label}
          <label
            >{dialogContent[dialog.state].label}:<input
              class="rounded border-2 border-slate-900 px-2"
              name={dialog.state === "save" ? "saveName" : "fileName"}
              type={dialog.state === "save" ? "text" : "file"}
              title={dialog.state === "save"
                ? "Cannot be the same as an existing save name"
                : ""}
              required
              pattern={saveNamePattern}
              autocomplete="off"
              spellcheck="false"
              autocorrect="off"
            /></label
          >
        {/if}
        <div class="flex flex-row justify-between gap-2">
          <button
            class="my-2 rounded border-2 border-slate-900 px-2"
            value="confirm">{dialogContent[dialog.state].confirmText}</button
          >
          <button
            class="my-2 rounded border-2 border-slate-900 px-2"
            value="cancel"
            formnovalidate>Cancel</button
          >
        </div>
      {/if}
    </form>
  </dialog>
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
