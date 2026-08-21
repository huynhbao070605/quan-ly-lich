import { describe, expect, test } from "vitest";

import {
  getDashboardSummary,
  type DashboardProjectRecord,
  type DashboardSupabaseClient,
  type DashboardTaskRecord,
} from "./queries";

const now = new Date("2026-08-21T08:00:00.000+07:00");

const projects: DashboardProjectRecord[] = [
  {
    id: "project-1",
    user_id: "server-user-id",
    name: "Công việc",
    color: "#0f766e",
    archived: false,
  },
  {
    id: "project-2",
    user_id: "server-user-id",
    name: "Học tập",
    color: "#7c3aed",
    archived: false,
  },
  {
    id: "archived-project",
    user_id: "server-user-id",
    name: "Đã lưu trữ",
    color: null,
    archived: true,
  },
];

const tasks: DashboardTaskRecord[] = [
  {
    id: "task-today",
    user_id: "server-user-id",
    project_id: "project-1",
    title: "Chuẩn bị họp hôm nay",
    status: "TODO",
    priority: "HIGH",
    due_at: "2026-08-21T03:00:00.000Z",
    completed_at: null,
  },
  {
    id: "task-in-progress",
    user_id: "server-user-id",
    project_id: "project-1",
    title: "Viết bản tổng hợp",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    due_at: "2026-08-21T10:00:00.000Z",
    completed_at: null,
  },
  {
    id: "task-overdue",
    user_id: "server-user-id",
    project_id: "project-2",
    title: "Chốt việc quá hạn",
    status: "TODO",
    priority: "URGENT",
    due_at: "2026-08-20T09:00:00.000Z",
    completed_at: null,
  },
  {
    id: "task-upcoming",
    user_id: "server-user-id",
    project_id: "project-2",
    title: "Lên kế hoạch tuần tới",
    status: "TODO",
    priority: "LOW",
    due_at: "2026-08-23T02:00:00.000Z",
    completed_at: null,
  },
  {
    id: "task-done",
    user_id: "server-user-id",
    project_id: "project-1",
    title: "Việc đã hoàn thành",
    status: "DONE",
    priority: "MEDIUM",
    due_at: "2026-08-20T09:00:00.000Z",
    completed_at: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "task-cancelled",
    user_id: "server-user-id",
    project_id: "project-2",
    title: "Việc đã hủy",
    status: "CANCELLED",
    priority: "LOW",
    due_at: "2026-08-19T09:00:00.000Z",
    completed_at: null,
  },
  {
    id: "other-user-task",
    user_id: "other-user-id",
    project_id: "project-1",
    title: "Không thuộc người dùng hiện tại",
    status: "TODO",
    priority: "HIGH",
    due_at: "2026-08-21T03:00:00.000Z",
    completed_at: null,
  },
];

function createDashboardClient() {
  const operations: Array<Record<string, unknown>> = [];

  function createBuilder<T extends DashboardTaskRecord | DashboardProjectRecord>(
    table: "tasks" | "projects",
    rows: T[],
  ) {
    const filters: Array<{ column: string; value: string | boolean }> = [];
    const builder = {
      eq(column: string, value: string | boolean) {
        filters.push({ column, value });
        operations.push({ method: "eq", table, column, value });
        return builder;
      },
      order(column: string, options?: { ascending?: boolean }) {
        operations.push({ method: "order", table, column, options });
        return builder;
      },
      select(columns?: string) {
        operations.push({ method: "select", table, columns });
        return builder;
      },
      then(
        resolve: (value: { data: T[]; error: Error | null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        const data = rows.filter((row) =>
          filters.every((filter) => row[filter.column as keyof T] === filter.value),
        );

        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };

    return builder;
  }

  const supabase = {
    from(table: "tasks" | "projects") {
      operations.push({ method: "from", table });

      return table === "tasks"
        ? createBuilder(table, tasks)
        : createBuilder(table, projects);
    },
  } as unknown as DashboardSupabaseClient;

  return { operations, supabase };
}

describe("getDashboardSummary", () => {
  test("scopes task and project queries to the authenticated user", async () => {
    const { operations, supabase } = createDashboardClient();

    await getDashboardSummary(supabase, "server-user-id", now);

    expect(operations).toContainEqual({ method: "from", table: "tasks" });
    expect(operations).toContainEqual({
      method: "eq",
      table: "tasks",
      column: "user_id",
      value: "server-user-id",
    });
    expect(operations).toContainEqual({ method: "from", table: "projects" });
    expect(operations).toContainEqual({
      method: "eq",
      table: "projects",
      column: "archived",
      value: false,
    });
  });

  test("calculates dashboard counts and completion percentage from user tasks", async () => {
    const { supabase } = createDashboardClient();

    const summary = await getDashboardSummary(supabase, "server-user-id", now);

    expect(summary.todayCount).toBe(2);
    expect(summary.inProgressCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.completionPercentage).toBe(20);
    expect(summary.statusBreakdown).toEqual([
      { status: "TODO", label: "Cần làm", count: 3 },
      { status: "IN_PROGRESS", label: "Đang thực hiện", count: 1 },
      { status: "DONE", label: "Hoàn thành", count: 1 },
      { status: "CANCELLED", label: "Đã hủy", count: 1 },
    ]);
  });

  test("returns today, upcoming and project progress collections", async () => {
    const { supabase } = createDashboardClient();

    const summary = await getDashboardSummary(supabase, "server-user-id", now);

    expect(summary.todayTasks.map((task) => task.title)).toEqual([
      "Chuẩn bị họp hôm nay",
      "Viết bản tổng hợp",
    ]);
    expect(summary.upcomingTasks.map((task) => task.title)).toEqual([
      "Lên kế hoạch tuần tới",
    ]);
    expect(summary.overdueTasks.map((task) => task.title)).toEqual([
      "Chốt việc quá hạn",
    ]);
    expect(summary.projectProgress).toEqual([
      {
        id: "project-1",
        name: "Công việc",
        color: "#0f766e",
        taskCount: 3,
        doneCount: 1,
        completionPercentage: 33,
      },
      {
        id: "project-2",
        name: "Học tập",
        color: "#7c3aed",
        taskCount: 2,
        doneCount: 0,
        completionPercentage: 0,
      },
    ]);
  });
});
