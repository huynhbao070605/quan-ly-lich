import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { moveTask, reorderColumn } from "./kanban-actions";

const taskId = "00000000-0000-4000-8000-000000000010";

function createUpdateClient() {
  const operations: Array<Record<string, unknown>> = [];
  const builder = {
    eq(column: string, value: string) {
      operations.push({ method: "eq", column, value });
      return builder;
    },
    select(columns?: string) {
      operations.push({ method: "select", columns });
      return builder;
    },
    single() {
      operations.push({ method: "single" });
      return Promise.resolve({
        data: {
          id: taskId,
          user_id: "server-user-id",
          status: "DONE",
          kanban_position: 42,
          completed_at: "2026-08-21T09:00:00.000Z",
        },
        error: null,
      });
    },
    update(value: Record<string, unknown>) {
      operations.push({ method: "update", value });
      return builder;
    },
  };

  const supabase = {
    from(table: string) {
      operations.push({ method: "from", table });
      return builder;
    },
    rpc: vi.fn(),
  };

  return { operations, supabase };
}

function createRpcClient(error: Error | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error });

  return {
    operations: [] as Array<Record<string, unknown>>,
    supabase: {
      from: vi.fn(),
      rpc,
    },
  };
}

describe("kanban actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  });

  test("moveTask sets completed_at when moving to DONE and scopes by authenticated user", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T09:00:00.000Z"));
    const { operations, supabase } = createUpdateClient();
    mocks.createServerClient.mockResolvedValue(supabase);

    const result = await moveTask(taskId, "DONE", 42);

    expect(result.ok).toBe(true);
    expect(operations).toContainEqual({ method: "from", table: "tasks" });
    expect(operations).toContainEqual({
      method: "eq",
      column: "user_id",
      value: "server-user-id",
    });
    expect(operations).toContainEqual({ method: "eq", column: "id", value: taskId });
    expect(operations).toContainEqual({
      method: "update",
      value: {
        status: "DONE",
        kanban_position: 42,
        completed_at: "2026-08-21T09:00:00.000Z",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/kanban");
  });

  test("moveTask clears completed_at when moving out of DONE", async () => {
    const { operations, supabase } = createUpdateClient();
    mocks.createServerClient.mockResolvedValue(supabase);

    await moveTask(taskId, "IN_PROGRESS", 2.5);

    expect(operations).toContainEqual({
      method: "update",
      value: {
        status: "IN_PROGRESS",
        kanban_position: 2.5,
        completed_at: null,
      },
    });
  });

  test("moveTask rejects invalid status and position", async () => {
    const result = await moveTask(taskId, "UNKNOWN" as never, Number.NaN);

    expect(result).toEqual({
      ok: false,
      message: "Thông tin Kanban không hợp lệ.",
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("reorderColumn uses an authenticated RPC for atomic column ordering", async () => {
    const taskIds = [
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
    ];
    const { supabase } = createRpcClient();
    mocks.createServerClient.mockResolvedValue(supabase);

    const result = await reorderColumn("TODO", taskIds);

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.rpc).toHaveBeenCalledWith("reorder_kanban_column", {
      p_status: "TODO",
      p_task_ids: taskIds,
    });
    expect(mocks.requireUser).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/kanban");
  });

  test("reorderColumn returns the rollback message when the RPC fails", async () => {
    const { supabase } = createRpcClient(new Error("database unavailable"));
    mocks.createServerClient.mockResolvedValue(supabase);

    const result = await reorderColumn("TODO", [taskId]);

    expect(result).toEqual({
      ok: false,
      message: "Không thể cập nhật công việc. Vui lòng thử lại.",
    });
  });
});
