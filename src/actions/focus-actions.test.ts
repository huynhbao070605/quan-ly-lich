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

import { removeFocus, reorderFocus, setFocus } from "./focus-actions";

const taskId = "00000000-0000-4000-8000-000000000010";
const focusDate = "2026-08-21";

function createRpcClient(error: { code?: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error });
  return { rpc };
}

describe("focus actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  });

  test("setFocus delegates the max-three write to one authenticated RPC", async () => {
    const supabase = createRpcClient();
    mocks.createServerClient.mockResolvedValue(supabase);

    const result = await setFocus(taskId, focusDate, 2);

    expect(result).toEqual({ ok: true, data: null });
    expect(mocks.requireUser).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("set_task_focus", {
      p_task_id: taskId,
      p_focus_date: focusDate,
      p_focus_position: 2,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/ke-hoach-ngay");
  });

  test("setFocus maps a database uniqueness conflict to the max-three message", async () => {
    const supabase = createRpcClient({ code: "23505" });
    mocks.createServerClient.mockResolvedValue(supabase);

    const result = await setFocus(taskId, focusDate, 3);

    expect(result).toEqual({
      ok: false,
      message: "Bạn chỉ có thể chọn tối đa 3 công việc trọng tâm mỗi ngày.",
    });
  });

  test("removeFocus uses the authenticated Focus RPC", async () => {
    const supabase = createRpcClient();
    mocks.createServerClient.mockResolvedValue(supabase);

    const result = await removeFocus(taskId);

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.rpc).toHaveBeenCalledWith("remove_task_focus", {
      p_task_id: taskId,
    });
  });

  test("reorderFocus persists the complete ordered set with one RPC", async () => {
    const orderedTaskIds = [
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
    ];
    const supabase = createRpcClient();
    mocks.createServerClient.mockResolvedValue(supabase);

    const result = await reorderFocus(focusDate, orderedTaskIds);

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.rpc).toHaveBeenCalledWith("reorder_task_focus", {
      p_focus_date: focusDate,
      p_task_ids: orderedTaskIds,
    });
  });

  test("reorderFocus rejects duplicate task IDs before calling the database", async () => {
    const focusedTaskId = "00000000-0000-4000-8000-000000000011";
    const supabase = createRpcClient();
    mocks.createServerClient.mockResolvedValue(supabase);

    const result = await reorderFocus(focusDate, [focusedTaskId, focusedTaskId]);

    expect(result).toEqual({
      ok: false,
      message: "Thông tin trọng tâm không hợp lệ.",
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("reorderFocus rejects more than three task IDs before calling the database", async () => {
    const result = await reorderFocus(focusDate, [
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
      "00000000-0000-4000-8000-000000000013",
      "00000000-0000-4000-8000-000000000014",
    ]);

    expect(result).toEqual({
      ok: false,
      message: "Thông tin trọng tâm không hợp lệ.",
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
