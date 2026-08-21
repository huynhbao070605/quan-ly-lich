import { describe, expect, test } from "vitest";
import {
  buildListTasksQuery,
  buildSearchTasksQuery,
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
      column: "task_tags.tag_id",
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

  test("uses an inner task-tag embed when filtering by tag", () => {
    const selected: string[] = [];
    const builder = {
      eq() { return builder; },
      gte() { return builder; },
      in() { return builder; },
      lt() { return builder; },
      not() { return builder; },
      or() { return builder; },
      order() { return builder; },
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
      "*, projects(*), task_tags!inner(tags(*)), subtasks(*)",
    ]);
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
