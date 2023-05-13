import { writable } from "svelte/store";

type Objective = { title: string } & (
  | { subObjectives: Objective[] }
  | { details: string[]; steps: string[] }
);
type Position = number[];

const TUTORIAL_STEPS: Objective[] = [
  {
    title: "Building the Swarm",
    subObjectives: [
      {
        title: "Metal Production",
        subObjectives: [
          {
            title: "Fabricate 1 Miner",
            details: [
              "The first order of priority is to set up a basic metal production chain. This will allow you to begin tapping into the planet's resources, an essential step in building the swarm.",
              "Metal production starts with <a>miners</a> extracting ore from the planet's crust. Fabricate one, and make sure it is <a>working</a>.",
            ],
            steps: [
              "Open the <a>Fabricator Panel</a>",
              "Start editing the <a>Build Queue</a>",
              "Add a build order for a <a>Miner</a> to the queue",
              "<a>Save</a> the changed queue",
              "<a>Wait</a> for the fabricator to <a>Work</a>",
            ],
          },
          {
            title: "Fabricate 1 Refiner",
            details: [
              "Now that we are extracting ore, we can proceed to the second part of metal production: refining that ore into metal that can be used for further fabrication.",
              "Fabricate a <a>refiner</a>, and make sure it is <a>working</a>",
            ],
            steps: [
              "Open the <a>Fabricator Panel</a>",
              "Start editing the <a>Build Queue</a>",
              "Add a build order for a <a>Refiner</a> to the queue",
              "<a>Save</a> the changed queue",
              "<a>Wait</a> for the fabricator to <a>Work</a>",
            ],
          },
        ],
      },
      {
        title: "Energy Production",
        subObjectives: [
          {
            title: "Fabricate 10 Solar Collectors",
            details: [],
            steps: [
              "Open the <a>Fabricator Panel</a>",
              "Start editing the <a>Build Queue</a>",
              "Add a repeating build order for 10 <a>Solar Collectors</a> to the queue",
              "<a>Save</a> the changed queue",
              "<a>Wait</a> for the fabricator to <a>Work</a>",
            ],
          },
        ],
      },
      { title: "Satellite Production", subObjectives: [] },
    ],
  },
  {
    title: "Manipulating the Simulation",
    subObjectives: [
      {
        title: "Controlling the Flow of Time",
        subObjectives: [
          {
            title: "Play and Pause the Simulation Clock",
            details: [],
            steps: [],
          },
          { title: "Changing the Clock Speed", details: [], steps: [] },
        ],
      },
      {
        title: "Controlling Fabrication",
        subObjectives: [
          {
            title: "Single Build Orders",
            subObjectives: [
              { title: "Insert a Build Order", details: [], steps: [] },
              {
                title: "Change a Build Order's Construct",
                details: [],
                steps: [],
              },
              { title: "Remove a Build Order", details: [], steps: [] },
            ],
          },
          {
            title: "Repeat Build Orders",
            subObjectives: [
              { title: "Create a Repeat Order", details: [], steps: [] },
              { title: "Remove a Repeat Order", details: [], steps: [] },
              {
                title: "Change a Repeat Order's Count",
                details: [],
                steps: [],
              },
              {
                title: "Create an infinite Repeat Order",
                details: [],
                steps: [],
              },
              { title: "Unwrap a Repeat Order", details: [], steps: [] },
            ],
          },
        ],
      },
    ],
  },
];

export type TutorialState = {
  open: boolean;
  progress: Set<Position>;
  active: Position;
};
export function makeTutorialStore(
  // steps: unknown[],
  { open, progress, active }: TutorialState = {
    open: false,
    progress: new Set(),
    active: [],
  }
) {
  const { update, subscribe } = writable({ open, progress, active });
  return {
    objectives: TUTORIAL_STEPS,
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
    setActive: (p: Position) =>
      update((state) => {
        state.active = p;
        return state;
      }),
    completeStep: (p: Position) =>
      update((state) => {
        state.progress.add(p);
        return state;
      }),
  };
}
export type TutorialStore = ReturnType<typeof makeTutorialStore>;
