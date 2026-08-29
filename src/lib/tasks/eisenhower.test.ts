import { describe, expect, test } from "vitest";
import { quadrantFromFlags, suggestEisenhower } from "./eisenhower";

const now = new Date("2026-08-21T08:00:00.000+07:00");

describe("suggestEisenhower", () => {
  test.each([
    {
      name: "HIGH + due in 2h => DO_NOW",
      input: {
        priority: "HIGH" as const,
        dueAt: new Date("2026-08-21T10:00:00.000+07:00"),
        status: "TODO" as const,
        now,
      },
      quadrant: "DO_NOW",
    },
    {
      name: "HIGH + due in 3d => SCHEDULE",
      input: {
        priority: "HIGH" as const,
        dueAt: new Date("2026-08-24T08:00:00.000+07:00"),
        status: "TODO" as const,
        now,
      },
      quadrant: "SCHEDULE",
    },
    {
      name: "LOW + due in 2h => DELEGATE",
      input: {
        priority: "LOW" as const,
        dueAt: new Date("2026-08-21T10:00:00.000+07:00"),
        status: "TODO" as const,
        now,
      },
      quadrant: "DELEGATE",
    },
    {
      name: "LOW + no due => ELIMINATE",
      input: {
        priority: "LOW" as const,
        dueAt: null,
        status: "TODO" as const,
        now,
      },
      quadrant: "ELIMINATE",
    },
  ])("$name", ({ input, quadrant }) => {
    expect(quadrantFromFlags(suggestEisenhower(input))).toBe(quadrant);
  });

  test("marks overdue open tasks as urgent", () => {
    expect(
      suggestEisenhower({
        priority: "MEDIUM",
        dueAt: new Date("2026-08-21T07:59:59.000+07:00"),
        status: "TODO",
        now,
      }).urgent,
    ).toBe(true);
  });

  test("does not mark completed overdue tasks as urgent", () => {
    expect(
      suggestEisenhower({
        priority: "URGENT",
        dueAt: new Date("2026-08-21T07:59:59.000+07:00"),
        status: "DONE",
        now,
      }).urgent,
    ).toBe(false);
  });

  test("uses exactly 24 hours as the upcoming deadline threshold", () => {
    expect(
      suggestEisenhower({
        priority: "MEDIUM",
        dueAt: new Date("2026-08-22T08:00:00.000+07:00"),
        status: "TODO",
        now,
      }).urgent,
    ).toBe(true);

    expect(
      suggestEisenhower({
        priority: "MEDIUM",
        dueAt: new Date("2026-08-22T08:00:01.000+07:00"),
        status: "TODO",
        now,
      }).urgent,
    ).toBe(false);
  });
});

describe("quadrantFromFlags", () => {
  test.each([
    [{ important: true, urgent: true }, "DO_NOW"],
    [{ important: true, urgent: false }, "SCHEDULE"],
    [{ important: false, urgent: true }, "DELEGATE"],
    [{ important: false, urgent: false }, "ELIMINATE"],
  ] as const)("maps %o to %s", (flags, quadrant) => {
    expect(quadrantFromFlags(flags)).toBe(quadrant);
  });
});
