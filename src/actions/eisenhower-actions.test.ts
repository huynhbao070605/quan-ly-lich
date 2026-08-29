import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getTaskRecordById: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
  updateTaskRecord: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/tasks/task-repository", () => ({
  getTaskRecordById: mocks.getTaskRecordById,
  updateTaskRecord: mocks.updateTaskRecord,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { overrideEisenhower, resetEisenhower } from "./eisenhower-actions";

const taskId = "00000000-0000-4000-8000-000000000010";

const existingTask = {
  id: taskId,
  user_id: "server-user-id",
  project_id: null,
  title: "Nộp báo cáo",
  description: null,
  status: "TODO",
  priority: "HIGH",
  start_at: null,
  due_at: "2026-08-24T08:00:00.000Z",
  all_day: false,
  important: false,
  urgent: false,
  eisenhower_override: true,
  focus_date: null,
  focus_position: null,
  kanban_position: 0,
  recurrence_id: null,
  recurrence_instance_at: null,
  completed_at: null,
  created_at: "2026-08-21T01:00:00.000Z",
  updated_at: "2026-08-21T01:00:00.000Z",
};

describe("eisenhower actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
    mocks.getTaskRecordById.mockResolvedValue(existingTask);
    mocks.updateTaskRecord.mockResolvedValue(existingTask);
  });

  test("overrideEisenhower maps DO_NOW to manual important and urgent flags", async () => {
    const result = await overrideEisenhower(taskId, "DO_NOW");

    expect(result.ok).toBe(true);
    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      {
        important: true,
        urgent: true,
        eisenhowerOverride: true,
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/eisenhower");
  });

  test("overrideEisenhower rejects invalid quadrant before auth", async () => {
    const result = await overrideEisenhower(taskId, "UNKNOWN" as never);

    expect(result).toEqual({
      ok: false,
      message: "Thông tin Eisenhower không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  test("resetEisenhower clears manual override and recomputes from current priority and due date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T08:00:00.000+07:00"));

    await resetEisenhower(taskId);

    expect(mocks.getTaskRecordById).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
    );
    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      {
        important: true,
        urgent: false,
        eisenhowerOverride: false,
      },
    );
  });

  test("resetEisenhower reports not found when the scoped task does not exist", async () => {
    mocks.getTaskRecordById.mockResolvedValue(null);

    const result = await resetEisenhower(taskId);

    expect(result).toEqual({
      ok: false,
      message: "Không tìm thấy công việc.",
    });
    expect(mocks.updateTaskRecord).not.toHaveBeenCalled();
  });
});
