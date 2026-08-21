import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  countFocusTasks: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
  updateTaskRecord: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/tasks/focus", () => ({
  countFocusTasks: mocks.countFocusTasks,
}));
vi.mock("@/lib/tasks/task-repository", () => ({
  updateTaskRecord: mocks.updateTaskRecord,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { removeFocus, reorderFocus, setFocus } from "./focus-actions";

const taskId = "00000000-0000-4000-8000-000000000010";
const focusDate = "2026-08-21";
const taskRecord = {
  id: taskId,
  user_id: "server-user-id",
  focus_date: focusDate,
  focus_position: 1,
};

describe("focus actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
    mocks.countFocusTasks.mockResolvedValue(2);
    mocks.updateTaskRecord.mockResolvedValue(taskRecord);
  });

  test("setFocus rejects the fourth focus task on the same day before updating", async () => {
    mocks.countFocusTasks.mockResolvedValue(3);

    const result = await setFocus(taskId, focusDate, 3);

    expect(result).toEqual({
      ok: false,
      message: "Bạn chỉ có thể chọn tối đa 3 công việc trọng tâm mỗi ngày.",
    });
    expect(mocks.updateTaskRecord).not.toHaveBeenCalled();
  });

  test("setFocus scopes the update by authenticated user", async () => {
    const result = await setFocus(taskId, focusDate, 2);

    expect(result).toEqual({ ok: true, data: taskRecord });
    expect(mocks.countFocusTasks).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      focusDate,
      taskId,
    );
    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      {
        focusDate,
        focusPosition: 2,
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/ke-hoach-ngay");
  });

  test("removeFocus clears focus fields", async () => {
    await removeFocus(taskId);

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      {
        focusDate: null,
        focusPosition: null,
      },
    );
  });

  test("reorderFocus persists positions for the selected date", async () => {
    const orderedTaskIds = [
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
    ];

    const result = await reorderFocus(focusDate, orderedTaskIds);

    expect(result).toEqual({ ok: true, data: null });
    expect(mocks.updateTaskRecord).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      "server-user-id",
      orderedTaskIds[0],
      { focusDate, focusPosition: 1 },
    );
    expect(mocks.updateTaskRecord).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      "server-user-id",
      orderedTaskIds[1],
      { focusDate, focusPosition: 2 },
    );
  });
});
