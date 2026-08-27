import { describe, expect, test } from "vitest";
import {
  buildListTasksQuery,
  buildSearchTasksQuery,
  getTaskList,
  listTasks,
  type TaskQueryOperation,
} from "./task-queries";

function expectOperation(
  operations: TaskQueryOperation[],
  expected: TaskQueryOperation,
) {
  expect(operations).toContainEqual(expected);
}

describe("buildSearchTasksQuery", () => {
  test("trims search query and scopes by current user", () => {
    const operations = buildSearchTasksQuery("server-user-id", "  báo cáo  ");

    expectOperation(operations, {
      type: "eq",
      column: "user_id",
      value: "server-user-id",
    });
    expectOperation(operations, {
      type: "or",
      expression: "title.ilike.%báo cáo%,description.ilike.%báo cáo%",
    });
  });

  test("does not add a text search condition for an empty query", () => {
    const operations = buildSearchTasksQuery("server-user-id", "   ");

    expect(operations.some((operation) => operation.type === "or")).toBe(false);
    expectOperation(operations, {
      type: "eq",
      column: "user_id",
      value: "server-user-id",
    });
  });
});

describe("buildListTasksQuery", () => {
  test("applies project, tag, priority and status filters without client-side filtering", () => {
    const operations = buildListTasksQuery("server-user-id", {
      projectId: "00000000-0000-4000-8000-000000000020",
      tagIds: ["00000000-0000-4000-8000-000000000030"],
      priority: "HIGH",
      status: "IN_PROGRESS",
    });

    expectOperation(operations, {
      type: "eq",
      column: "user_id",
      value: "server-user-id",
    });
    expectOperation(operations, {
      type: "eq",
      column: "project_id",
      value: "00000000-0000-4000-8000-000000000020",
    });
    expectOperation(operations, {
      type: "in",
      column: "matching_task_tags.tag_id",
      values: ["00000000-0000-4000-8000-000000000030"],
    });
    expectOperation(operations, {
      type: "eq",
      column: "priority",
      value: "HIGH",
    });
    expectOperation(operations, {
      type: "eq",
      column: "status",
      value: "IN_PROGRESS",
    });
  });

  test("uses a separate inner task-tag alias when filtering by tag so the full tag relation remains available", () => {
    const selected: string[] = [];
    const builder = {
      eq() { return builder; },
      gte() { return builder; },
      in() { return builder; },
      lt() { return builder; },
      not() { return builder; },
      or() { return builder; },
      order() { return builder; },
      range() { return builder; },
      select(columns?: string) {
        if (columns) selected.push(columns);
        return builder;
      },
    };
    const client = { from: () => builder };

    listTasks(client, "server-user-id", {
      tagIds: ["00000000-0000-4000-8000-000000000030"],
    });

    expect(selected).toEqual([
      "*, projects(*), recurrence_series:recurrence_series!tasks_recurrence_series_id_fkey(*), matching_task_tags:task_tags!inner(tags(*)), task_tags(tags(*)), subtasks(*), task_reminders(offset_minutes)",
    ]);
  });

  test("loads unfiltered tasks even when optional nested relations are absent", async () => {
    const rows = [
      {
        id: "task-a",
        user_id: "server-user-id",
        project_id: null,
        title: "Plain task",
        status: "TODO",
        priority: "MEDIUM",
        due_at: "2026-08-27T03:00:00.000Z",
        all_day: false,
        recurrence_series_id: null,
        recurrence_series: null,
        projects: null,
        task_tags: [],
        subtasks: [],
        task_reminders: [],
      },
      {
        id: "task-b",
        user_id: "server-user-id",
        project_id: "project-1",
        title: "Tagged task",
        status: "IN_PROGRESS",
        priority: "HIGH",
        due_at: "2026-08-27T04:00:00.000Z",
        all_day: false,
        recurrence_series_id: null,
        recurrence_series: null,
        projects: { id: "project-1", name: "Project" },
        task_tags: [
          { tags: { id: "tag-1", name: "Tag 1" } },
          { tags: { id: "tag-2", name: "Tag 2" } },
        ],
        subtasks: [],
        task_reminders: [{ offset_minutes: 60 }],
      },
      {
        id: "task-c",
        user_id: "server-user-id",
        project_id: null,
        title: "Done all-day",
        status: "DONE",
        priority: "LOW",
        due_at: "2026-08-27T17:00:00.000Z",
        all_day: true,
        recurrence_series_id: null,
        recurrence_series: null,
        projects: null,
        task_tags: [],
        subtasks: [],
        task_reminders: [],
      },
      {
        id: "task-d",
        user_id: "server-user-id",
        project_id: null,
        title: "Cancelled task",
        status: "CANCELLED",
        priority: "URGENT",
        due_at: "2026-08-28T03:00:00.000Z",
        all_day: false,
        recurrence_series_id: null,
        recurrence_series: null,
        projects: null,
        task_tags: [],
        subtasks: [],
        task_reminders: [],
      },
      {
        id: "task-e",
        user_id: "server-user-id",
        project_id: null,
        title: "Recurring task",
        status: "TODO",
        priority: "HIGH",
        due_at: "2026-08-29T03:00:00.000Z",
        all_day: false,
        recurrence_series_id: "series-1",
        recurrence_series: {
          id: "series-1",
          frequency: "WEEKLY",
          interval: 1,
          weekdays: [1, 3, 5],
          month_day: null,
          ends_at: null,
        },
        projects: null,
        task_tags: [],
        subtasks: [],
        task_reminders: [],
      },
    ];
    let selectedColumns = "";
    const builder = {
      eq() { return builder; },
      gte() { return builder; },
      in() { return builder; },
      lt() { return builder; },
      not() { return builder; },
      or() { return builder; },
      order() { return builder; },
      range() { return builder; },
      select(columns?: string) {
        selectedColumns = columns ?? "";
        return builder;
      },
      then(resolve: (value: { data: typeof rows | null; error: Error | null }) => void) {
        if (selectedColumns.includes("recurrence_series(*)")) {
          resolve({
            data: null,
            error: new Error("Could not embed because more than one relationship was found for tasks and recurrence_series."),
          });
          return undefined;
        }

        resolve({ data: rows, error: null });
        return undefined;
      },
    };
    const client = { from: () => builder };

    await expect(getTaskList(client, "server-user-id")).resolves.toEqual(rows);
  });

  test("throws Supabase task query errors instead of returning an empty task list", async () => {
    const builder = {
      eq() { return builder; },
      gte() { return builder; },
      in() { return builder; },
      lt() { return builder; },
      not() { return builder; },
      or() { return builder; },
      order() { return builder; },
      range() { return builder; },
      select() { return builder; },
      then(resolve: (value: { data: null; error: Error }) => void) {
        resolve({ data: null, error: new Error("permission denied for table tasks") });
        return undefined;
      },
    };
    const client = { from: () => builder };

    await expect(getTaskList(client, "server-user-id")).rejects.toThrow(
      "permission denied for table tasks",
    );
  });

  test("limits the first task list page to 50 rows by default", () => {
    const rangeCalls: Array<[number, number]> = [];
    const builder = {
      eq() { return builder; },
      gte() { return builder; },
      in() { return builder; },
      lt() { return builder; },
      not() { return builder; },
      or() { return builder; },
      order() { return builder; },
      range(from: number, to: number) {
        rangeCalls.push([from, to]);
        return builder;
      },
      select() { return builder; },
    };
    const client = { from: () => builder };

    listTasks(client, "server-user-id");

    expect(rangeCalls).toEqual([[0, 49]]);
  });

  test("overdue filter excludes DONE and CANCELLED", () => {
    const now = new Date("2026-08-21T08:00:00.000+07:00");
    const operations = buildListTasksQuery("server-user-id", {
      overdue: true,
      now,
    });

    expectOperation(operations, {
      type: "lt",
      column: "due_at",
      value: now.toISOString(),
    });
    expectOperation(operations, {
      type: "notIn",
      column: "status",
      values: ["DONE", "CANCELLED"],
    });
  });

  test("today and upcoming filters use date ranges", () => {
    const now = new Date("2026-08-21T08:00:00.000+07:00");

    expect(buildListTasksQuery("server-user-id", { today: true, now })).toEqual(
      expect.arrayContaining([
        { type: "gte", column: "due_at", value: "2026-08-20T17:00:00.000Z" },
        { type: "lt", column: "due_at", value: "2026-08-21T17:00:00.000Z" },
      ]),
    );

    expect(
      buildListTasksQuery("server-user-id", { upcoming: true, now }),
    ).toEqual(
      expect.arrayContaining([
        { type: "gte", column: "due_at", value: "2026-08-21T17:00:00.000Z" },
      ]),
    );
  });
});
