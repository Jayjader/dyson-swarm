<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import { APP_UI_CONTEXT, simulationIsLoaded } from "../appStateStore";
  import NavButton from "../NavButton.svelte";
  import type { SaveStubs } from "./uiStore";
  import { uiStore } from "./uiStore";
  import Delete from "./dialog/Delete.svelte";
  import Save from "./dialog/Save.svelte";
  import Load from "./dialog/Load.svelte";

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
    console.info({ stack });
    saveStubs = stack[0];
    if (stack?.[1]?.tag === "warn-discard-on-close") {
      selected = { index: -2 };
      dialog = stack[1];
      return;
    }
    const index = stack?.[1] ?? -2;
    const name = index === -1 ? "AUTOSAVE" : saveStubs.slots[index]?.name;
    selected = { index, name };
    const dialogState = stack?.[2];
    console.info({ dialogState });
    if (
      (dialog === "delete" && dialogState === undefined) ||
      (dialog === "save" && dialogState === undefined)
    ) {
      uiStore.updateStubs(window.localStorage);
    }
    dialog = dialogState;
    // dialogStore?.subscribe((values) => {
    //   console.info({ values });
    // });
    // if (dialog?.tag === "loading") {
    //   // switch (dialog.previous)
    //   dialog.promise
    //     .then((saveState) => {
    //       uiStore.finishLoading();
    //       if (inSimulation) {
    //         appUiStore.replaceRunningSimulation(saveState);
    //       } else {
    //         appUiStore.startSimulation(saveState);
    //       }
    //     })
    //     .catch((_e) => {
    //       /*todo: error dialog*/
    //     });
    // }
  });

  // $: {
  //   if (dialog !== undefined ) {
  //     dialogElement.showModal();
  //   }
  // }

  let inSimulation = false;
  let simulation = null;
  const appUiStore = getContext(APP_UI_CONTEXT).uiStore;
  let simSub = null;
  let dialogElement;
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

  /*
  function onDialogClose(closeEvent) {
    const playerCommand = closeEvent.target.returnValue;
    console.info({ playerCommand, dialog });
    if (playerCommand === "cancel") {
      dialog = undefined;
    } else {
      switch (dialog.tag) {
        case undefined:
          return;
        case "export": {
          exportAction(
            selected.name!,
            closeEvent.target.firstChild.elements["fileName"].value
          );
          break;
        }
        case "import": {
          importAction(
            closeEvent.target.firstChild.elements["fileName"].files[0],
            selected.name
          );
          break;
        }
        case "save": {
          uiStore.confirmSave(
            closeEvent.target.firstChild.elements["saveName"].value,
            simulation,
            window.localStorage
          );
          break;
        }
        case "warn-overwrite-on-save":
          uiStore.confirmOverwrite();
          break;
        case "warn-discard-on-load":
          uiStore.confirmDiscardBeforeLoad(window.localStorage);
          break;
        case "warn-discard-on-close":
          uiStore.confirmDiscardBeforeClosing();
          appUiStore.closeSimulation();
          break;
        case "delete":
          uiStore.deleteChosen(window.localStorage);
          break;
      }
    }
  }
*/

  /*
  function exportAction(slotName: string, fileName: string): void {
    uiStore.confirmExport(fileName, window.localStorage, document);
    // const saveState = readSave(slotName, window.localStorage)! as Save;
    // saveState.name = fileName;
    // writeSaveDataToBlob(saveState, document);
    // uiStore.unselectChosenSlot();
  }
*/

  /*
  function importAction(fileData: File, overWrittenSlotName?: string): void {
    if (overWrittenSlotName !== undefined) {
      deleteSave(
        window.localStorage,
        selected.index === -1 ? "AUTOSAVE" : saveStubs.slots[selected].name
      );
    }
    fileData.text().then((data) => {
      writeSlotToStorage(
        {
          name: fileData.name,
          ...parseProcessors(data),
        },
        window.localStorage
      );
      uiStore.unselectChosenSlot();
      uiStore.updateStubs(window.localStorage);
    });
  }
*/

  /*
  function cloneAction(this: MouseEvent, slotName: string): void {
    writeSlotToStorage(
      {
        ...readSave(slotName, window.localStorage)!,
        name: `${slotName} (cloned)`,
      },
      window.localStorage
    );
    uiStore.unselectChosenSlot();
    uiStore.updateStubs(window.localStorage);
  }
*/
</script>

<main
  style="max-width: 23rem"
  class="m-auto flex flex-col justify-between gap-2 bg-slate-200"
>
  <header class="m-2 flex flex-row justify-between gap-2">
    <nav class="flex flex-col gap-2">
      {#if selected.index === -2}
        <NavButton
          on:click={inSimulation
            ? appUiStore.closeSaveSlots
            : appUiStore.closeSaveSlotsInSimulation}
          >Back&nbsp;to {#if inSimulation}Simulation{:else}Title{/if}</NavButton
        >
      {:else}
        <NavButton on:click={uiStore.unselectChosenSlot}
          >Cancel Choice</NavButton
        >
      {/if}
      {#if inSimulation && selected.index === -2}
        <NavButton on:click={uiStore.startCloseAction}
          >Close Simulation</NavButton
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
        on:click={uiStore.startSaveAction}>Save</button
      >
    {:else}
      <div>
        <!--empty div to preserve how the grid auto-places the remaining buttons in a quick and dirty way-->
      </div>
    {/if}
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || overWriteDisabled}
      on:click={() => {
        /*todo*/
      }}
    >
      <!--todo: dialog = slotIsEmpty ? "import" : "warn-overwrite-on-import";-->
      Import</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}
      on:click={uiStore.startDeleteAction.bind(this, selected.name)}
      >Delete</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}
      on:click={uiStore.startLoadAction.bind(
        this,
        inSimulation,
        window.localStorage
      )}>Load</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}
      on:click={() => {}}
    >
      <!--todo: dialog = "export";-->
      Export</button
    >
    <button
      class="rounded border-2 border-slate-900 disabled:border-dashed"
      disabled={allDisabled || slotIsEmpty}
      on:click={() => {
        /*todo: cloneAction.bind(this, selected.name)*/
      }}>Clone</button
    >
  </div>
  {#if dialog === "delete"}
    <Delete
      name={selected.name}
      on:close={(event) => {
        console.log({ result: event.detail });
        uiStore.endDeleteAction();
      }}
    />
  {:else if dialog === "save"}
    <Save
      simulationState={simulation}
      overWrittenName={selected.name}
      saveNames={saveStubs.slots.map((slot) => slot.name)}
      on:close={(event) => {
        console.log({ result: event.detail });
        uiStore.endSaveAction();
      }}
    />
  {:else if dialog === "load"}
    <Load
      name={selected.name}
      {inSimulation}
      on:close={(event) => {
        console.log({ result: event.detail });
        uiStore.endLoadAction();
        const saveState = event.detail.saveState;
        if (saveState !== undefined) {
          (inSimulation
            ? appUiStore.replaceRunningSimulation
            : appUiStore.startSimulation)(saveState);
        }
      }}
    />
  {:else if dialog}
    <dialog
      class="border-2 border-slate-900"
      bind:this={dialogElement}
      on:close={() => {}}
    >
      <!-- todo: progress/loading dialog (using {#await}), and delete save only when loading new save succeeds -->
      <form method="dialog">
        {#if dialog !== undefined}
          {#if dialog.tag === "loading"}
            {#await dialog.promise}
              <p>loading...</p>
            {:catch error}
              <p class="text-red-600">{error.message}</p>
            {/await}
          {:else if dialog?.text}
            <p>{dialog?.text}</p>
          {:else if dialog?.label}
            <label
              >{dialog?.label}<input
                class="rounded border-2 border-slate-900 px-2"
                name={dialog.tag === "save" ? "saveName" : "fileName"}
                type={dialog.tag === "import" ? "file" : "text"}
                title={dialog.tag === "save"
                  ? "Cannot be the same as an existing save name"
                  : ""}
                required
                value={dialog.tag === "export" ? `${selected.name}.json` : ""}
                pattern={dialog.tag === "export" ? ".*" : saveNamePattern}
                autocomplete="off"
                spellcheck="false"
                autocorrect="off"
              /></label
            >
          {/if}
          <div class="flex flex-row justify-between gap-2">
            <button
              class="my-2 rounded border-2 border-slate-900 px-2"
              value="confirm">{dialog?.confirmText}</button
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
