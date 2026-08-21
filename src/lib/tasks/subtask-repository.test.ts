import { describe, expect, test } from "vitest";
import {
  getTaskRecordBySubtaskId,
  type SubtaskSupabaseClient,
} from "./subtask-repository";

function createOwnershipClient(data: { task_id: string } | null) {
  const operations: Array<Record<string, unknown>> = [];
  const builder = {
    eq(column: string, value: string) {
      operations.push({ method: "eq", column, value });
      return builder;
    },
    maybeSingle() {
      operations.push({ method: "maybeSingle" });
      return Promise.resolve({ data, error: null });
    },
    select(columns?: string) {
      operations.push({ method: "select", columns });
      return builder;
    },
  };

  const supabase = {
    from(table: string) {
      operations.push({ method: "from", table });
      return builder;
    },
  } as unknown as SubtaskSupabaseClient;

  return { operations, supabase };
}

describe("getTaskRecordBySubtaskId", () => {
  test("uses an inner parent task ownership proof for the child subtask", async () => {
    const { operations, supabase } = createOwnershipClient({
      task_id: "00000000-0000-4000-8000-000000000010",
    });

    const result = await getTaskRecordBySubtaskId(
      supabase,
      "server-user-id",
      "00000000-0000-4000-8000-000000000040",
    );

    expect(result).toEqual({ id: "00000000-0000-4000-8000-000000000010" });
    expect(operations).toContainEqual({ method: "from", table: "subtasks" });
    expect(operations).toContainEqual({
      method: "select",
      columns: "task_id, tasks!inner(id)",
    });
    expect(operations).toContainEqual({
      method: "eq",
      column: "id",
      value: "00000000-0000-4000-8000-000000000040",
    });
    expect(operations).toContainEqual({
      method: "eq",
      column: "tasks.user_id",
      value: "server-user-id",
    });
  });

  test("returns null when the subtask is not owned by the user", async () => {
    const { supabase } = createOwnershipClient(null);

    await expect(
      getTaskRecordBySubtaskId(
        supabase,
        "server-user-id",
        "00000000-0000-4000-8000-000000000040",
      ),
    ).resolves.toBeNull();
  });
});
