import { describe, expect, test } from "vitest";
import {
  areEqual,
  findAutoStartPositions,
  getNextObjective,
  isBefore,
  walkObjectivePositions,
} from "./objectives";

describe("objective tracker", () => {
  describe("objective positions", () => {
    describe("walk list from position", () => {
      test("works on flat list", () => {
        expect(
          walkObjectivePositions([
            { title: "", details: [""], steps: [] },
            { title: "", details: [""], steps: [] },
            { title: "", details: [""], steps: [] },
          ]),
        ).toEqual([[0], [1], [2]]);
      });
      test("works on nested list", () => {
        expect(
          walkObjectivePositions([
            { title: "", details: [""], steps: [] },
            {
              title: "",
              subObjectives: [
                { title: "", details: [""], steps: [] },
                { title: "", details: [""], steps: [] },
              ],
            },
            { title: "", details: [""], steps: [] },
          ]),
        ).toEqual([[0], [1], [1, 0], [1, 1], [2]]);
      });
      test("resume from position", () => {
        expect(
          walkObjectivePositions(
            [
              { title: "", details: [""], steps: [] },
              {
                title: "",
                subObjectives: [
                  { title: "", details: [""], steps: [] },
                  { title: "", details: [""], steps: [] },
                ],
              },
              { title: "", details: [""], steps: [] },
            ],
            [1, 0],
          ),
        ).toEqual([[1, 0], [1, 1], [2]]);
      });
    });
    describe("position a is before position b", () => {
      test('"flat" - ie 1 coordinate - positions', () => {
        expect(isBefore([], [])).toBeTruthy();
        expect(isBefore([], [0])).toBeTruthy();
        expect(isBefore([0], [])).toBeFalsy();
        expect(isBefore([0], [0])).toBeTruthy();
        expect(isBefore([0], [1])).toBeTruthy();
        expect(isBefore([1], [0])).toBeFalsy();
      });
      test('"nested" - ie 2+ coordinates - positions', () => {
        expect(isBefore([], [0, 1])).toBeTruthy();
        expect(isBefore([0, 1], [])).toBeFalsy();
        expect(isBefore([0], [0, 1])).toBeTruthy();
        expect(isBefore([0, 1], [0])).toBeFalsy();
        expect(isBefore([0, 1], [0, 1])).toBeTruthy();
        expect(isBefore([1], [0, 1])).toBeFalsy();
        expect(isBefore([0, 2], [0, 1])).toBeFalsy();
      });
    });
    describe("position a is equal to position b", () => {
      test('"flat" - ie 1 coordinate - positions', () => {
        expect(areEqual([], [])).toBeTruthy();
        expect(areEqual([], [0])).toBeFalsy();
        expect(areEqual([0], [])).toBeFalsy();
        expect(areEqual([0], [0])).toBeTruthy();
        expect(areEqual([0], [1])).toBeFalsy();
        expect(areEqual([1], [0])).toBeFalsy();
      });
      test('"nested" - ie 2+ coordinates - positions', () => {
        expect(areEqual([], [0, 1])).toBeFalsy();
        expect(areEqual([0, 1], [])).toBeFalsy();
        expect(areEqual([0], [0, 1])).toBeFalsy();
        expect(areEqual([0, 1], [0])).toBeFalsy();
        expect(areEqual([0, 1], [0, 1])).toBeTruthy();
        expect(areEqual([1], [0, 1])).toBeFalsy();
        expect(areEqual([0, 2], [0, 1])).toBeFalsy();
      });
    });
    describe("find autostart positions", () => {
      test("works on flat list", () => {
        expect(
          findAutoStartPositions([
            { title: "", details: [""], steps: [], autostart: true },
            { title: "", details: [""], steps: [] },
            { title: "", details: [""], steps: [] },
            { title: "", details: [""], steps: [], autostart: true },
            { title: "", details: [""], steps: [] },
          ]),
        ).toEqual([[0], [3]]);
      });
      test("works on nested list", () => {
        expect(
          findAutoStartPositions([
            { title: "", details: [""], steps: [], autostart: true },
            { title: "", details: [""], steps: [] },
            {
              title: "",
              subObjectives: [
                {
                  title: "",
                  subObjectives: [
                    { title: "", details: [""], steps: [], autostart: true },
                    { title: "", details: [""], steps: [] },
                  ],
                },
                { title: "", details: [""], steps: [] },
              ],
            },
            { title: "", details: [""], steps: [] },
          ]),
        ).toEqual([[0], [2, 0, 0]]);
      });
    });
    describe("find next objective", () => {
      // todo: investigate whether getNextObjective should be able to recurse out of a top-level objective to the next top-level in the list
      test("flat objective list", () => {
        expect(
          getNextObjective(
            [
              { title: "a", details: [""], steps: [] },
              { title: "b", details: [""], steps: [] },
              { title: "c", details: [""], steps: [] },
              { title: "d", details: [""], steps: [] },
            ],
            [1],
          ),
        ).toEqual([{ title: "c", details: [""], steps: [] }, [2]]);
      });
      test("nested objective list", () => {
        const objectives = [
          { title: "a", details: [""], steps: [] },
          {
            title: "b",
            subObjectives: [
              {
                title: "c",
                subObjectives: [
                  { title: "d", details: [""], steps: [] },
                  { title: "e", details: [""], steps: [] },
                ],
              },
              { title: "f", details: [""], steps: [] },
            ],
          },
          { title: "g", details: [""], steps: [] },
          { title: "h", details: [""], steps: [] },
        ];
        expect(getNextObjective(objectives, [0] /* a */)).toEqual([
          { title: "d", details: [""], steps: [] },
          [1, 0, 0],
        ]);
        expect(getNextObjective(objectives, [1, 0, 1] /* e */)).toEqual([
          { title: "f", details: [""], steps: [] },
          [1, 1],
        ]);
        expect(getNextObjective(objectives, [1, 1] /* f */)).toEqual([
          { title: "g", details: [""], steps: [] },
          [2],
        ]);
      });
    });
  });
});
