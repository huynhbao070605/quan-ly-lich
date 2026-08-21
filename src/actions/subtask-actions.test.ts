import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addSubtaskRecord: vi.fn(),
  createServerClient: vi.fn(),
  deleteSubtaskRecord: vi.fn(),
  getTaskRecordById: vi.fn(),
  getTaskRecordBySubtaskId: vi.fn(),
  revalidatePath: vi.fn(),
  reorderSubtaskRecords: vi.fn(),
  requireUser: vi.fn(),
  toggleSubtaskRecord: vi.fn(),
  updateTaskRecord: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/tasks/subtask-repository", () => ({
  addSubtaskRecord: mocks.addSubtaskRecord,
  deleteSubtaskRecord: mocks.deleteSubtaskRecord,
  getTaskRecordBySubtaskId: mocks.getTaskRecordBySubtaskId,
  reorderSubtaskRecords: mocks.reorderSubtaskRecords,
  toggleSubtaskRecord: mocks.toggleSubtaskRecord,
}));
vi.mock("@/lib/tasks/task-repository", () => ({
  getTaskRecordById: mocks.getTaskRecordById,
  updateTaskRecord: mocks.updateTaskRecord,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { setTaskStatus } from "./task-actions";
import {
  addSubtask,
  deleteSubtask,
  reorderSubtasks,
  toggleSubtask,
} from "./subtask-actions";

const taskId = "00000000-0000-4000-8000-000000000010";
const subtaskId = "00000000-0000-4000-8000-000000000040";

const taskRecord = {
  id: taskId,
  user_id: "server-user-id",
  project_id: null,
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

const subtaskRecord = {
  id: subtaskId,
  task_id: taskId,
  title: "Kiểm tra số liệu",
  completed: false,
  position: 0,
  created_at: "2026-08-21T01:00:00.000Z",
  updated_at: "2026-08-21T01:00:00.000Z",
};

describe("subtask actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
    mocks.getTaskRecordById.mockResolvedValue(taskRecord);
    mocks.getTaskRecordBySubtaskId.mockResolvedValue(taskRecord);
    mocks.addSubtaskRecord.mockResolvedValue(subtaskRecord);
    mocks.toggleSubtaskRecord.mockResolvedValue({
      ...subtaskRecord,
      completed: true,
    });
    mocks.reorderSubtaskRecords.mockResolvedValue([
      { ...subtaskRecord, id: "00000000-0000-4000-8000-000000000041", position: 0 },
      { ...subtaskRecord, id: "00000000-0000-4000-8000-000000000042", position: 1 },
    ]);
    mocks.deleteSubtaskRecord.mockResolvedValue(undefined);
    mocks.updateTaskRecord.mockResolvedValue({
      ...taskRecord,
      status: "DONE",
      completed_at: "2026-08-21T09:00:00.000Z",
    });
  });

  test("addSubtask verifies parent task ownership before mutation", async () => {
    const result = await addSubtask(taskId, "  Kiểm tra số liệu  ");

    expect(result).toEqual({ ok: true, data: subtaskRecord });
    expect(mocks.getTaskRecordById).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
    );
    expect(mocks.addSubtaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      taskId,
      expect.objectContaining({ title: "Kiểm tra số liệu" }),
    );
  });

  test("addSubtask rejects cross-user parent tasks", async () => {
    mocks.getTaskRecordById.mockResolvedValue(null);

    const result = await addSubtask(taskId, "Kiểm tra số liệu");

    expect(result).toEqual({
      ok: false,
      message: "Không tìm thấy công việc.",
    });
    expect(mocks.addSubtaskRecord).not.toHaveBeenCalled();
  });

  test("toggleSubtask verifies ownership through its parent task", async () => {
    const result = await toggleSubtask(subtaskId, true);

    expect(result).toEqual({
      ok: true,
      data: { ...subtaskRecord, completed: true },
    });
    expect(mocks.getTaskRecordBySubtaskId).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      subtaskId,
    );
    expect(mocks.toggleSubtaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      subtaskId,
      true,
    );
  });

  test("reorderSubtasks writes zero-based positions in the provided order", async () => {
    const orderedIds = [
      "00000000-0000-4000-8000-000000000041",
      "00000000-0000-4000-8000-000000000042",
    ];

    await reorderSubtasks(taskId, orderedIds);

    expect(mocks.reorderSubtaskRecords).toHaveBeenCalledWith(
      expect.anything(),
      taskId,
      [
        { id: orderedIds[0], position: 0 },
        { id: orderedIds[1], position: 1 },
      ],
    );
  });

  test("deleteSubtask verifies ownership through its parent task", async () => {
    const result = await deleteSubtask(subtaskId);

    expect(result).toEqual({ ok: true, data: null });
    expect(mocks.getTaskRecordBySubtaskId).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      subtaskId,
    );
    expect(mocks.deleteSubtaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      subtaskId,
    );
  });

  test("setTaskStatus can complete the parent task even when checklist is incomplete", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T09:00:00.000Z"));

    await setTaskStatus(taskId, "DONE");

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({
        status: "DONE",
        completedAt: "2026-08-21T09:00:00.000Z",
      }),
    );
    expect(mocks.getTaskRecordBySubtaskId).not.toHaveBeenCalled();
  });
});
