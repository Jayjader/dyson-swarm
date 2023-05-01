import { writable } from "svelte/store";

type Step = { details: unknown; subSteps?: Step[] };

const TUTORIAL_STEPS = [
  {
    subSteps: [
      { details: "TODO INTRO FIRST PART" },
      { details: "TODO INTRO SECOND PART" },
    ],
  },
];

export type TutorialState = {
  open: boolean;
  progress: Set<Step>;
  active?: Step;
};
export function makeTutorialStore(
  // steps: unknown[],
  { open, progress, active }: TutorialState = {
    open: false,
    progress: new Set(),
    active: undefined,
  }
) {
  const { update, subscribe } = writable({ open, progress, active });
  return {
    steps: TUTORIAL_STEPS as Step[],
    subscribe,
    open: () =>
      update((state) => {
        state.open = true;
        return state;
      }),
    close: () =>
      update((state) => {
        state.open = false;
        return state;
      }),
    setActive: (step: Step) =>
      update((state) => {
        state.active = step;
        return state;
      }),
    completeStep: (step: Step) =>
      update((state) => {
        state.progress.add(step);
        return state;
      }),
  };
}
export type TutorialStore = ReturnType<typeof makeTutorialStore>;
