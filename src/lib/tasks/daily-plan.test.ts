import { describe, expect, test } from "vitest";

import {
  groupDailyPlanTasks,
  isTaskInDailyPlan,
  type DailyPlanTask,
} from "./daily-plan";

const date = new Date("2026-08-21T08:00:00.000+07:00");

function task(overrides: Partial<DailyPlanTask>): DailyPlanTask {
  return {
    id: "task-id",
    title: "Công việc",
    status: "TODO",
    startAt: null,
    dueAt: null,
    allDay: false,
    completedAt: null,
    focusDate: null,
    focusPosition: null,
    ...overrides,
  };
}

describe("isTaskInDailyPlan", () => {
  test("includes tasks due today", () => {
    expect(
      isTaskInDailyPlan(task({ dueAt: "2026-08-21T10:00:00.000+07:00" }), date),
    ).toBe(true);
  });

  test("includes tasks that start today and are due later", () => {
    expect(
      isTaskInDailyPlan(
        task({
          startAt: "2026-08-21T09:00:00.000+07:00",
          dueAt: "2026-08-24T09:00:00.000+07:00",
        }),
        date,
      ),
    ).toBe(true);
  });

  test("does not include a task spanning yesterday through tomorrow by default", () => {
    expect(
      isTaskInDailyPlan(
        task({
          startAt: "2026-08-20T09:00:00.000+07:00",
          dueAt: "2026-08-22T09:00:00.000+07:00",
        }),
        date,
      ),
    ).toBe(false);
  });

  test("includes overdue open tasks", () => {
    expect(
      isTaskInDailyPlan(task({ dueAt: "2026-08-20T09:00:00.000+07:00" }), date),
    ).toBe(true);
  });

  test("includes DONE tasks completed today", () => {
    expect(
      isTaskInDailyPlan(
        task({
          status: "DONE",
          completedAt: "2026-08-21T11:00:00.000+07:00",
        }),
        date,
      ),
    ).toBe(true);
  });
});

describe("groupDailyPlanTasks", () => {
  test("groups focus, overdue, today, all-day and completed tasks", () => {
    const tasks = [
      task({
        id: "focus-2",
        title: "Trọng tâm 2",
        dueAt: "2026-08-21T09:00:00.000+07:00",
        focusDate: "2026-08-21",
        focusPosition: 2,
      }),
      task({
        id: "focus-1",
        title: "Trọng tâm 1",
        dueAt: "2026-08-21T08:00:00.000+07:00",
        focusDate: "2026-08-21",
        focusPosition: 1,
      }),
      task({
        id: "overdue",
        title: "Quá hạn",
        dueAt: "2026-08-20T08:00:00.000+07:00",
      }),
      task({
        id: "today",
        title: "Hôm nay",
        dueAt: "2026-08-21T10:00:00.000+07:00",
      }),
      task({
        id: "all-day",
        title: "Cả ngày",
        allDay: true,
        dueAt: "2026-08-21T00:00:00.000+07:00",
      }),
      task({
        id: "done",
        title: "Hoàn thành",
        status: "DONE",
        completedAt: "2026-08-21T11:00:00.000+07:00",
      }),
    ];

    expect(groupDailyPlanTasks(tasks, date)).toEqual({
      focus: [tasks[1], tasks[0]],
      overdue: [tasks[2]],
      today: [tasks[3]],
      allDay: [tasks[4]],
      completed: [tasks[5]],
    });
  });
});
