import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createTaskRecord: vi.fn(),
  deleteTaskRecord: vi.fn(),
  getTaskRecordById: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
  setTaskReminderOffsets: vi.fn(),
  updateTaskRecord: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/tasks/task-repository", () => ({
  createTaskRecord: mocks.createTaskRecord,
  deleteTaskRecord: mocks.deleteTaskRecord,
  getTaskRecordById: mocks.getTaskRecordById,
  updateTaskRecord: mocks.updateTaskRecord,
}));
vi.mock("@/actions/reminder-actions", () => ({
  setTaskReminderOffsets: mocks.setTaskReminderOffsets,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createTask, setTaskStatus, updateTask } from "./task-actions";

const taskId = "00000000-0000-4000-8000-000000000010";

const existingTask = {
  id: taskId,
  user_id: "server-user-id",
  project_id: null,
  title: "Nộp báo cáo",
  description: null,
  status: "TODO",
  priority: "MEDIUM",
  start_at: null,
  due_at: "2026-08-21T10:00:00.000Z",
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

describe("task actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
    mocks.createTaskRecord.mockResolvedValue(existingTask);
    mocks.updateTaskRecord.mockResolvedValue(existingTask);
    mocks.getTaskRecordById.mockResolvedValue(existingTask);
    mocks.setTaskReminderOffsets.mockResolvedValue({ ok: true, data: null });
  });

  test("createTask ignores any client-provided userId", async () => {
    const result = await createTask({
      title: "Nộp báo cáo",
      userId: "caller-user-id",
    } as never);

    expect(result).toEqual({ ok: true, data: existingTask });
    expect(mocks.createTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      expect.not.objectContaining({ userId: "caller-user-id" }),
    );
  });

  test("createTask derives automatic Eisenhower flags from priority", async () => {
    await createTask({
      title: "Nộp báo cáo",
      priority: "HIGH",
    });

    expect(mocks.createTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      expect.objectContaining({
        important: true,
        urgent: false,
        eisenhowerOverride: false,
      }),
    );
  });

  test("createTask sets completed_at when created as DONE", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T09:35:00.000Z"));

    await createTask({ title: "Nộp báo cáo", status: "DONE" });

    expect(mocks.createTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      expect.objectContaining({
        status: "DONE",
        completedAt: "2026-08-21T09:35:00.000Z",
      }),
    );
  });

  test("createTask forwards tag IDs for owned relation synchronization", async () => {
    const tagIds = ["00000000-0000-4000-8000-000000000030"];

    await createTask({ title: "Nộp báo cáo", tagIds });

    expect(mocks.createTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      expect.objectContaining({ tagIds }),
    );
  });

  test("createTask applies requested reminder offsets after creating the task", async () => {
    await createTask({
      title: "Nộp báo cáo",
      dueAt: "2026-08-26T02:30:00.000Z",
      reminderOffsets: [1440, 60],
    });

    expect(mocks.setTaskReminderOffsets).toHaveBeenCalledWith(taskId, [1440, 60]);
  });

  test("setTaskStatus sets completed_at when moving to DONE", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T09:30:00.000Z"));

    await setTaskStatus(taskId, "DONE");

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({
        status: "DONE",
        completedAt: "2026-08-21T09:30:00.000Z",
      }),
    );
  });

  test("setTaskStatus clears completed_at when moving DONE to IN_PROGRESS", async () => {
    await setTaskStatus(taskId, "IN_PROGRESS");

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({
        status: "IN_PROGRESS",
        completedAt: null,
      }),
    );
  });

  test("updateTask sets completed_at when status changes to DONE", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T09:45:00.000Z"));

    await updateTask(taskId, { status: "DONE" });

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({
        status: "DONE",
        completedAt: "2026-08-21T09:45:00.000Z",
      }),
    );
  });

  test("updateTask clears completed_at when status moves out of DONE", async () => {
    mocks.getTaskRecordById.mockResolvedValue({
      ...existingTask,
      status: "DONE",
      completed_at: "2026-08-21T09:30:00.000Z",
    });

    await updateTask(taskId, { status: "IN_PROGRESS" });

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({
        status: "IN_PROGRESS",
        completedAt: null,
      }),
    );
  });

  test("updateTask preserves completed_at when an already-DONE task is saved", async () => {
    const completedAt = "2026-08-20T09:30:00.000Z";
    mocks.getTaskRecordById.mockResolvedValue({
      ...existingTask,
      status: "DONE",
      completed_at: completedAt,
    });

    await updateTask(taskId, { title: "Báo cáo đã sửa", status: "DONE" });

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({ completedAt }),
    );
  });

  test("updateTask recalculates Eisenhower when override is false", async () => {
    await updateTask(taskId, {
      priority: "HIGH",
      dueAt: "2026-08-21T10:00:00.000Z",
    });

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({
        priority: "HIGH",
        important: true,
        urgent: true,
      }),
    );
  });

  test("updateTask preserves manual Eisenhower flags when override is true", async () => {
    mocks.getTaskRecordById.mockResolvedValue({
      ...existingTask,
      priority: "LOW",
      important: false,
      urgent: false,
      eisenhower_override: true,
    });

    await updateTask(taskId, {
      priority: "URGENT",
    });

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.not.objectContaining({
        important: true,
        urgent: true,
      }),
    );
  });

  test("updateTask strips manual Eisenhower fields from the generic mutation path", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T00:00:00.000Z"));

    await updateTask(taskId, {
      priority: "URGENT",
      important: false,
      urgent: false,
      eisenhowerOverride: true,
    });

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({
        priority: "URGENT",
        important: true,
        urgent: false,
      }),
    );
    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.not.objectContaining({ eisenhowerOverride: true }),
    );
  });

  test("updateTask forwards tag IDs for owned relation synchronization", async () => {
    const tagIds = ["00000000-0000-4000-8000-000000000030"];

    await updateTask(taskId, { tagIds });

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({ tagIds }),
    );
  });

  test("updateTask refreshes reminder offsets only after the primary task update succeeds", async () => {
    await updateTask(taskId, {
      dueAt: "2026-08-26T02:30:00.000Z",
      reminderOffsets: [60, 0],
    });

    expect(mocks.setTaskReminderOffsets).toHaveBeenCalledWith(taskId, [60, 0]);

    mocks.updateTaskRecord.mockRejectedValueOnce(new Error("primary update failed"));
    mocks.setTaskReminderOffsets.mockClear();

    const result = await updateTask(taskId, {
      dueAt: "2026-08-26T03:30:00.000Z",
      reminderOffsets: [1440],
    });

    expect(result.ok).toBe(false);
    expect(mocks.setTaskReminderOffsets).not.toHaveBeenCalled();
  });
});
