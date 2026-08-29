import { describe, expect, test } from "vitest";

import {
  formatWeekRange,
  getWeekRange,
  getWorkloadLevel,
  groupTasksByVietnamDay,
  type WeeklyPlanTask,
} from "@/lib/tasks/weekly-plan";

function task(overrides: Partial<WeeklyPlanTask> = {}): WeeklyPlanTask {
  return {
    id: "task-1",
    title: "Công việc mẫu",
    status: "TODO",
    startAt: null,
    dueAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe("getWeekRange", () => {
  test("starts on Monday and ends on Sunday in Vietnam", () => {
    const week = getWeekRange(new Date("2026-08-20T12:00:00.000+07:00"));

    expect(week.start.toISOString()).toBe("2026-08-16T17:00:00.000Z");
    expect(week.end.toISOString()).toBe("2026-08-23T16:59:59.999Z");
    expect(week.days.map((day) => day.key)).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
  });
});

describe("formatWeekRange", () => {
  test("formats a normal week without time noise", () => {
    const week = getWeekRange(new Date("2026-08-26T12:00:00.000+07:00"));

    expect(formatWeekRange(week.start, week.end)).toBe("24/08 - 30/08/2026");
  });

  test("formats a week crossing two months", () => {
    const week = getWeekRange(new Date("2026-09-01T12:00:00.000+07:00"));

    expect(formatWeekRange(week.start, week.end)).toBe("31/08 - 06/09/2026");
  });

  test("formats a week crossing two years", () => {
    const week = getWeekRange(new Date("2026-12-31T12:00:00.000+07:00"));

    expect(formatWeekRange(week.start, week.end)).toBe("28/12/2026 - 03/01/2027");
  });
});

describe("getWorkloadLevel", () => {
  test("marks fewer than seven open tasks as normal", () => {
    expect(getWorkloadLevel(6)).toBe("normal");
  });

  test("marks seven open tasks as heavy", () => {
    expect(getWorkloadLevel(7)).toBe("heavy");
  });
});

describe("groupTasksByVietnamDay", () => {
  test("places tasks on their Vietnam day and excludes closed tasks from workload", () => {
    const week = getWeekRange(new Date("2026-08-20T12:00:00.000+07:00"));
    const openTask = task({
      id: "open",
      dueAt: "2026-08-17T17:30:00.000Z",
    });
    const doneTask = task({
      id: "done",
      status: "DONE",
      dueAt: "2026-08-17T18:00:00.000Z",
    });
    const cancelledTask = task({
      id: "cancelled",
      status: "CANCELLED",
      dueAt: "2026-08-17T18:30:00.000Z",
    });

    const grouped = groupTasksByVietnamDay([openTask, doneTask, cancelledTask], week);

    expect(grouped["2026-08-17"].tasks).toEqual([]);
    expect(grouped["2026-08-18"].tasks).toEqual([openTask, doneTask, cancelledTask]);
    expect(grouped["2026-08-18"].openTaskCount).toBe(1);
  });
});
