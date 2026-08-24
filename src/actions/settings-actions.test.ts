import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  updateAppearance,
  updateNotificationSettings,
  updateTaskDefaults,
} from "./settings-actions";

function createUpdateClient() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return { client: { from }, eq, from, update };
}

describe("updateAppearance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects an invalid theme without querying Supabase", async () => {
    const result = await updateAppearance({ theme: "sepia" } as never);

    expect(result).toEqual({
      ok: false,
      message: "Giao diện đã chọn không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("rejects a malformed payload without querying Supabase", async () => {
    const result = await updateAppearance(null as never);

    expect(result).toEqual({
      ok: false,
      message: "Giao diện đã chọn không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("updates settings for the authenticated user, not a caller-supplied user", async () => {
    const updateClient = createUpdateClient();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue(updateClient.client);

    const result = await updateAppearance({
      theme: "dark",
      userId: "caller-user-id",
    } as never);

    expect(result).toEqual({ ok: true, message: "Đã lưu tùy chọn giao diện." });
    expect(updateClient.from).toHaveBeenCalledWith("user_settings");
    expect(updateClient.update).toHaveBeenCalledWith({ theme: "dark" });
    expect(updateClient.eq).toHaveBeenCalledWith("user_id", "server-user-id");
    expect(updateClient.eq).not.toHaveBeenCalledWith("user_id", "caller-user-id");
  });
});

describe("updateTaskDefaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects an invalid priority without querying Supabase", async () => {
    const result = await updateTaskDefaults({
      defaultPriority: "BLOCKER",
      defaultReminderOffsetsMinutes: [1440, 0],
      weekStart: 1,
      defaultTaskView: "list",
    } as never);

    expect(result).toEqual({
      ok: false,
      message: "Thiết lập công việc không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("rejects negative reminder offsets without querying Supabase", async () => {
    const result = await updateTaskDefaults({
      defaultPriority: "MEDIUM",
      defaultReminderOffsetsMinutes: [1440, -1],
      weekStart: 1,
      defaultTaskView: "list",
    } as never);

    expect(result).toEqual({
      ok: false,
      message: "Thiết lập công việc không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("rejects an unsupported default task view without querying Supabase", async () => {
    const result = await updateTaskDefaults({
      defaultPriority: "MEDIUM",
      defaultReminderOffsetsMinutes: [1440, 0],
      weekStart: 1,
      defaultTaskView: "timeline",
    } as never);

    expect(result).toEqual({
      ok: false,
      message: "Thiết lập công việc không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("normalizes reminder offsets and updates only the authenticated user's settings", async () => {
    const updateClient = createUpdateClient();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue(updateClient.client);

    const result = await updateTaskDefaults({
      defaultPriority: "HIGH",
      defaultReminderOffsetsMinutes: [1440, 0, 1440],
      weekStart: 1,
      defaultTaskView: "kanban",
      userId: "caller-user-id",
    } as never);

    expect(result).toEqual({ ok: true, message: "Đã lưu thiết lập công việc." });
    expect(updateClient.from).toHaveBeenCalledWith("user_settings");
    expect(updateClient.update).toHaveBeenCalledWith({
      default_priority: "HIGH",
      default_reminder_offsets_minutes: [1440, 0],
      week_start: 1,
      default_task_view: "kanban",
    });
    expect(updateClient.eq).toHaveBeenCalledWith("user_id", "server-user-id");
    expect(updateClient.eq).not.toHaveBeenCalledWith("user_id", "caller-user-id");
  });
});

describe("updateNotificationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects malformed notification toggles without querying Supabase", async () => {
    const result = await updateNotificationSettings({
      notifyReminder: true,
      notifyDueToday: "yes",
      notifyOverdue: true,
      notifyRecurring: true,
    } as never);

    expect(result).toEqual({
      ok: false,
      message: "Thiết lập thông báo không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("updates notification toggles only for the authenticated user", async () => {
    const updateClient = createUpdateClient();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue(updateClient.client);

    const result = await updateNotificationSettings({
      notifyReminder: true,
      notifyDueToday: false,
      notifyOverdue: true,
      notifyRecurring: false,
      userId: "caller-user-id",
    } as never);

    expect(result).toEqual({ ok: true, message: "Đã lưu thiết lập thông báo." });
    expect(updateClient.from).toHaveBeenCalledWith("user_settings");
    expect(updateClient.update).toHaveBeenCalledWith({
      notify_reminder: true,
      notify_due_today: false,
      notify_overdue: true,
      notify_recurring: false,
    });
    expect(updateClient.eq).toHaveBeenCalledWith("user_id", "server-user-id");
    expect(updateClient.eq).not.toHaveBeenCalledWith("user_id", "caller-user-id");
  });
});
