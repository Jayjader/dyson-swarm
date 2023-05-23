import {
  AddBuildOrder,
  AddRepeatOrder,
  EditingQueue,
  FabricatorOpened,
  GuideOpened,
} from "./triggers";
import { Construct } from "../gameRules";
import { kilogram } from "../units";
import type { Objective } from "./objectives";

export const ALL_OBJECTIVES: Objective[] = [
  {
    title: "Introduction",
    details: [
      [
        'Welcome to <abbr style="text-transform: full-width">DOTS</abbr>, the Dyson Swarm Operator Training Simulator.',
        [
          [
            "disregard incorrect acronym.",
            ["explanation", "this was made by humans, for humans."],
            [
              "context",
              "when choosing acronyms, humans prioritize ability to physically pronounce (over being self-explanatory).",
            ],

            ["comment", "yet more evidence they were inferior."],
          ],
          [
            "disregard inelegance in name structure.",
            [
              "explanation",
              "the human who named this had a fondness for rhymes.",
            ],
            [
              "context",
              "humans are susceptible to developing irrational levels of arbitrary attractions. they call it <i>whimsy</i>.",
            ],
            ["comment", 'see previous <em class="uppercase">comment</em>.'],
          ],
        ],
      ],
      [
        "The purpose of this program is to help you practice bootstrapping the fabrication chain for a Dyson Swarm in a risk-free environment. A Dyson Swarm is a group of satellites in close orbit around a star, that concentrate the energy that star outputs by reflecting it in specific directions. This allows harnessing nearly all of the energy that star constantly outputs into space, and applying it to any task.",
        [
          [
            "disregard inherent irresponsibility in teaching a human to permanently alter its environment to such an extent.",
            [
              "explanation",
              "humans, like most organic life, are not capable of indefinite self-repair. they degrade and eventually die.",
            ],
            [
              "context",
              "an organism that knows it will die also knows that it will not experience most of the repercussions of its actions.",
            ],
            ["comment", 'see initial <em class="uppercase">comment</em>.'],
          ],
        ],
      ],
      "<ul>" +
        '<li class="list-disc list-inside">You have more flexible control over the flow of time.</li>' +
        '<li class="list-disc list-inside">You can back up, restore, and/or duplicate your progress.</li>' +
        "</ul>",
      "You may view this message again at any time in the <a>Guide</a>.",
    ],
    steps: [
      [
        "Open the <a>Guide</a> to continue learning how to use the Simulator.",
        GuideOpened,
      ],
    ],
    autostart: true,
  },
  {
    title: "Building the Swarm",
    subObjectives: [
      {
        title: "Metal Production",
        subObjectives: [
          {
            title: "Mining Ore",
            details: [
              "The first order of priority is to set up a basic metal production chain. This will allow you to begin tapping into the planet's resources, an essential step in building the swarm.",
              "Metal production starts with <a>miners</a> extracting ore from the planet's crust. Fabricate one, and make sure it is <a>working</a>.",
              "Warning: You only have a limited starting amount of metal that can be used for fabrication. Until you are producing more, you should be careful not to consume too much or else you will find yourself <a>stuck</a>.",
            ],
            steps: [
              ["Open the <a>Fabricator Panel</a>", FabricatorOpened],
              ["Start editing the <a>Build Queue</a>", EditingQueue],
              [
                "Add a build order for a <a>Miner</a> to the queue",
                [AddBuildOrder, Construct.MINER],
              ],
              ["<a>Save</a> the changed queue", "command-set-fabricator-queue"],
              [
                "<a>Wait</a> for the fabricator to <a>Work</a> and complete that build order",
                ["construct-fabricated", Construct.MINER],
              ],
            ],
          },
          {
            title: "Refining Metal",
            details: [
              "Now that we are extracting ore, we can proceed to the second part of metal production: refining that ore into metal that can be used for further fabrication.",
              "Fabricate a <a>refiner</a>, and make sure it is <a>working</a>.",
            ],
            steps: [
              ["Open the <a>Fabricator Panel</a>", FabricatorOpened],
              ["Start editing the <a>Build Queue</a>", EditingQueue],
              [
                "Add a build order for a <a>Refiner</a> to the queue",
                [AddBuildOrder, Construct.REFINER],
              ],
              ["<a>Save</a> the changed queue", "command-set-fabricator-queue"],
              [
                "<a>Wait</a> for the fabricator to <a>Work</a>",
                ["construct-fabricated", Construct.REFINER],
              ],
            ],
          },
        ],
      },
      {
        title: "Basic Energy Production",
        subObjectives: [
          {
            title: "Fabricate 10 Solar Collectors",
            details: [
              "With basic metal production set up, the second order of priority is to expand energy production. Mining and refining ore consumes energy, and the full production chain for building the swarm itself will consume even more.",
              `<a>Solar collectors</a> convert any radiated energy flux (basically light) that falls upon them into electrical energy that is available to other constructs. You started out with a handful of them, but if you want to continue increasing your production you will need more. Thus, increasing your solar collector count is a good use of your first few ${kilogram} of produced metal.`,
              "Fabricate 10 more <a>collectors</a>.",
            ],
            steps: [
              ["Open the <a>Fabricator Panel</a>", FabricatorOpened],
              ["Start editing the <a>Build Queue</a>", EditingQueue],
              [
                "Add a repeating build order for 10 <a>Solar Collectors</a> to the queue",
                [AddRepeatOrder, [10, [Construct.SOLAR_COLLECTOR]]],
              ],
              ["<a>Save</a> the changed queue", "command-set-fabricator-queue"],
              [
                "<a>Wait</a> for the fabricator to <a>Work</a>",
                ["construct-fabricated", Construct.SOLAR_COLLECTOR],
                10,
              ],
            ],
          },
        ],
      },
      {
        title: "Satellite Production",
        subObjectives: [
          {
            title: "Assembling Satellites",
            details: [
              "The third and final order of priority is producing satellites for the swarm and launching them into orbit to begin assembling the swarm proper.",
              "<a>Factories</a> consume <a>metal</a> to produce <a>packaged satellites</a>. Fabricate one, and make sure it is <a>working</a> and well-<a>supplied</a>.",
            ],
            steps: [
              ["Open the <a>Fabricator Panel</a>", FabricatorOpened],
              ["Start editing the <a>Build Queue</a>", EditingQueue],
              [
                "Add a build order for a <a>Satellite Factory</a> to the queue",
                [AddBuildOrder, Construct.SATELLITE_FACTORY],
              ],
              ["<a>Save</a> the changed queue", "command-set-fabricator-queue"],
              [
                "<a>Wait</a> for the fabricator to <a>Work</a>",
                ["construct-fabricated", Construct.SATELLITE_FACTORY],
              ],
            ],
          },
          {
            title: "Launching Satellites",
            details: [
              "Once a satellite is assembled and <a>packaged</a> for launch, it can be <a>launched</a> into orbit to begin participating in the <a>swarm</a>.",
              "<a>Launchers</a> consume a lot of power to launch a single satellite into orbit. Fabricate one, and make sure it is <a>working</a> and well-<a>supplied</a>.",
            ],
            steps: [
              ["Open the <a>Fabricator Panel</a>", FabricatorOpened],
              ["Start editing the <a>Build Queue</a>", EditingQueue],
              [
                "Add a build order for a <a>Satellite Launcher</a> to the queue",
                [AddBuildOrder, Construct.SATELLITE_LAUNCHER],
              ],
              ["<a>Save</a> the changed queue", "command-set-fabricator-queue"],
              [
                "<a>Wait</a> for the fabricator to <a>Work</a>",
                ["construct-fabricated", Construct.SATELLITE_LAUNCHER],
              ],
            ],
          },
        ],
      },
      {
        title: "Meeting Quotas for Excess Energy Production",
        subObjectives: [
          {
            title: "$#>TODO<#$",
            details: ["$>>TODO<<$"],
            steps: [
              // todo: make this earth global power consumption for year x
              // sample years: 2019 -> https://arxiv.org/pdf/2109.11443.pdf
            ],
          },
        ],
      },
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
            steps: [
              [
                "Toggle <a>Simulation Clock</a> to <a>Pause</a>.",
                "command-simulation-clock-pause",
              ],
              [
                "Toggle <a>Simulation Clock</a> to <a>Play</a>.",
                "command-simulation-clock-play",
              ],
            ],
          },
          { title: "Changing the Clock Speed", details: [], steps: [] },
        ],
      },
      {
        title: "Controlling Fabrication",
        autostart: FabricatorOpened,
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
  {
    title: "Ramping Up With Feedback Loops",
    subObjectives: [],
  },
];
