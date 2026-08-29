import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getTaskRecordById: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
  setTaskReminderOffsets: vi.fn(),
  updateTaskRecord: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/tasks/task-repository", () => ({
  getTaskRecordById: mocks.getTaskRecordById,
  updateTaskRecord: mocks.updateTaskRecord,
}));
vi.mock("@/actions/reminder-actions", () => ({
  setTaskReminderOffsets: mocks.setTaskReminderOffsets,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { moveCalendarTask, resizeCalendarTask } from "./calendar-actions";

const taskId = "00000000-0000-4000-8000-000000000010";
const existingTask = {
  id: taskId,
  user_id: "server-user-id",
  project_id: null,
  title: "Nộp báo cáo",
  description: null,
  status: "TODO",
  priority: "HIGH",
  start_at: "2026-08-24T01:00:00.000Z",
  due_at: "2026-08-24T02:00:00.000Z",
  all_day: false,
  important: false,
  urgent: false,
  eisenhower_override: false,
  focus_date: null,
  focus_position: null,
  kanban_position: 0,
  recurrence_id: null,
  recurrence_instance_at: null,
  recurrence_series_id: null,
  occurrence_start_at: null,
  recurrence_exception: false,
  completed_at: null,
  created_at: "2026-08-20T01:00:00.000Z",
  updated_at: "2026-08-20T01:00:00.000Z",
};

describe("calendar actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T00:00:00.000Z"));
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
    mocks.getTaskRecordById.mockResolvedValue(existingTask);
    mocks.updateTaskRecord.mockResolvedValue(existingTask);
    mocks.setTaskReminderOffsets.mockResolvedValue({ ok: true, data: null });
  });

  test("moveCalendarTask updates timestamps, recalculates auto Eisenhower, and refreshes reminders", async () => {
    const result = await moveCalendarTask(taskId, {
      startAt: "2026-08-24T08:00:00.000Z",
      dueAt: "2026-08-24T09:00:00.000Z",
      allDay: false,
      reminderOffsets: [60, 0],
    });

    expect(result).toEqual({ ok: true, data: existingTask });
    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.objectContaining({
        startAt: "2026-08-24T08:00:00.000Z",
        dueAt: "2026-08-24T09:00:00.000Z",
        allDay: false,
        important: true,
        urgent: true,
      }),
    );
    expect(mocks.setTaskReminderOffsets).toHaveBeenCalledWith(taskId, [60, 0]);
  });

  test("resizeCalendarTask preserves manual Eisenhower flags", async () => {
    mocks.getTaskRecordById.mockResolvedValue({
      ...existingTask,
      eisenhower_override: true,
      important: false,
      urgent: false,
    });

    await resizeCalendarTask(taskId, {
      startAt: "2026-08-25T08:00:00.000Z",
      dueAt: "2026-08-25T10:00:00.000Z",
      reminderOffsets: [1440],
    });

    expect(mocks.updateTaskRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      taskId,
      expect.not.objectContaining({
        important: expect.any(Boolean),
        urgent: expect.any(Boolean),
      }),
    );
    expect(mocks.setTaskReminderOffsets).toHaveBeenCalledWith(taskId, [1440]);
  });
});
