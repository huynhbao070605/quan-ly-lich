import { describe, expect, test } from "vitest";
import {
  createTaskRecord,
  type TaskRecord,
  type TaskSupabaseClient,
  updateTaskRecord,
} from "./task-repository";

const taskRecord: TaskRecord = {
  id: "00000000-0000-4000-8000-000000000010",
  user_id: "server-user-id",
  project_id: "00000000-0000-4000-8000-000000000020",
  title: "Nộp báo cáo",
  description: null,
  status: "TODO",
  priority: "MEDIUM",
  start_at: null,
  due_at: null,
  all_day: false,
  important: false,
  urgent: false,
  eisenhower_override: false,
  focus_date: null,
  focus_position: null,
  kanban_position: 0,
  recurrence_id: null,
  recurrence_instance_at: null,
  completed_at: null,
  created_at: "2026-08-21T01:00:00.000Z",
  updated_at: "2026-08-21T01:00:00.000Z",
};

type Operation =
  | { method: "delete" | "insert" | "maybeSingle" | "select" | "single" | "update"; table: string; value?: unknown }
  | { method: "eq"; table: string; column: string; value: string }
  | { method: "from"; table: string }
  | { method: "in"; table: string; column: string; values: string[] }
  | { method: "rpc"; fn: string; args: Record<string, unknown> };

function createFakeSupabase(
  projectData: { id: string } | null,
  tagData: Array<{ id: string }> = [],
) {
  const operations: Operation[] = [];

  const createBuilder = (table: string) => {
    const builder = {
      delete() {
        operations.push({ method: "delete", table });
        return builder;
      },
      eq(column: string, value: string) {
        operations.push({ method: "eq", table, column, value });
        return builder;
      },
      insert(value: Record<string, unknown>) {
        operations.push({ method: "insert", table, value });
        return builder;
      },
      in(column: string, values: string[]) {
        operations.push({ method: "in", table, column, values });
        return builder;
      },
      maybeSingle() {
        operations.push({ method: "maybeSingle", table });
        return Promise.resolve({
          data: table === "projects" ? projectData : taskRecord,
          error: null,
        });
      },
      select(value?: string) {
        operations.push({ method: "select", table, value });
        return builder;
      },
      single() {
        operations.push({ method: "single", table });
        return Promise.resolve({ data: taskRecord, error: null });
      },
      then(
        resolve: (value: { data?: Array<{ id: string }>; error: Error | null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve({
          data: table === "tags" ? tagData : undefined,
          error: null,
        }).then(resolve, reject);
      },
      update(value: Record<string, unknown>) {
        operations.push({ method: "update", table, value });
        return builder;
      },
    };

    return builder;
  };

  const supabase = {
    from(table: string) {
      operations.push({ method: "from", table });
      return createBuilder(table);
    },
    rpc(fn: string, args: Record<string, unknown>) {
      operations.push({ method: "rpc", fn, args });
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as TaskSupabaseClient;

  return { operations, supabase };
}

describe("task repository project ownership", () => {
  test("createTaskRecord rejects an inaccessible project before inserting a task", async () => {
    const { operations, supabase } = createFakeSupabase(null);

    await expect(
      createTaskRecord(supabase, "server-user-id", {
        title: "Nộp báo cáo",
        projectId: "00000000-0000-4000-8000-000000000020",
      }),
    ).rejects.toThrow("Project not found.");

    expect(operations).toContainEqual({ method: "from", table: "projects" });
    expect(operations).toContainEqual({
      method: "eq",
      table: "projects",
      column: "user_id",
      value: "server-user-id",
    });
    expect(operations).not.toContainEqual(
      expect.objectContaining({ method: "insert", table: "tasks" }),
    );
  });

  test("updateTaskRecord validates owned project and scopes the task update by user_id", async () => {
    const { operations, supabase } = createFakeSupabase({
      id: "00000000-0000-4000-8000-000000000020",
    });

    await updateTaskRecord(
      supabase,
      "server-user-id",
      "00000000-0000-4000-8000-000000000010",
      {
        projectId: "00000000-0000-4000-8000-000000000020",
      },
    );

    expect(operations).toContainEqual({
      method: "eq",
      table: "projects",
      column: "user_id",
      value: "server-user-id",
    });
    expect(operations).toContainEqual({
      method: "eq",
      table: "tasks",
      column: "user_id",
      value: "server-user-id",
    });
  });

  test("createTaskRecord validates owned tags and synchronizes the relation", async () => {
    const tagId = "00000000-0000-4000-8000-000000000030";
    const { operations, supabase } = createFakeSupabase(null, [{ id: tagId }]);

    await createTaskRecord(supabase, "server-user-id", {
      title: "Nộp báo cáo",
      tagIds: [tagId],
    });

    expect(operations).toContainEqual({
      method: "eq",
      table: "tags",
      column: "user_id",
      value: "server-user-id",
    });
    expect(operations).toContainEqual({
      method: "rpc",
      fn: "sync_task_tags",
      args: { p_task_id: taskRecord.id, p_tag_ids: [tagId] },
    });
  });

  test("updateTaskRecord rejects an unowned tag before mutating the task", async () => {
    const { operations, supabase } = createFakeSupabase(null, []);

    await expect(
      updateTaskRecord(supabase, "server-user-id", taskRecord.id, {
        tagIds: ["00000000-0000-4000-8000-000000000030"],
      }),
    ).rejects.toThrow("Tag not found.");

    expect(operations).not.toContainEqual(
      expect.objectContaining({ method: "update", table: "tasks" }),
    );
  });

  test("updateTaskRecord synchronizes an owned tag selection", async () => {
    const tagId = "00000000-0000-4000-8000-000000000030";
    const { operations, supabase } = createFakeSupabase(null, [{ id: tagId }]);

    await updateTaskRecord(supabase, "server-user-id", taskRecord.id, {
      tagIds: [tagId],
    });

    expect(operations).toContainEqual({
      method: "rpc",
      fn: "sync_task_tags",
      args: { p_task_id: taskRecord.id, p_tag_ids: [tagId] },
    });
  });
});
