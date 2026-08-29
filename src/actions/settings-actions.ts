"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import { taskPrioritySchema } from "@/lib/validation/task";

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

const reminderOffsetsSchema = z.array(z.number().int().min(0).max(43200)).max(8);

const taskDefaultsSchema = z.object({
  defaultPriority: taskPrioritySchema,
  defaultReminderOffsetsMinutes: reminderOffsetsSchema,
  weekStart: z.literal(1),
  defaultTaskView: z.enum(["list", "kanban", "calendar", "eisenhower", "daily", "weekly"]),
});

const notificationSettingsSchema = z.object({
  notifyReminder: z.boolean(),
  notifyDueToday: z.boolean(),
  notifyOverdue: z.boolean(),
  notifyRecurring: z.boolean(),
});

export type AppearanceTheme = z.infer<typeof appearanceSchema>["theme"];
export type DefaultTaskView = z.infer<typeof taskDefaultsSchema>["defaultTaskView"];
export type TaskDefaultsInput = z.infer<typeof taskDefaultsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

export type SettingsActionResult = {
  ok: boolean;
  message: string;
};

function normalizeOffsets(offsets: number[]): number[] {
  return [...new Set(offsets)].toSorted((a, b) => b - a);
}

export async function updateAppearance(input: unknown): Promise<SettingsActionResult> {
  const parsed = appearanceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Giao diện đã chọn không hợp lệ.",
    };
  }

  const user = await requireUser();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ theme: parsed.data.theme })
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      message: "Không thể cập nhật giao diện. Vui lòng thử lại.",
    };
  }

  revalidatePath("/app/cai-dat");

  return {
    ok: true,
    message: "Đã lưu tùy chọn giao diện.",
  };
}

export async function updateTaskDefaults(input: unknown): Promise<SettingsActionResult> {
  const parsed = taskDefaultsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Thiết lập công việc không hợp lệ.",
    };
  }

  const user = await requireUser();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("user_settings")
    .update({
      default_priority: parsed.data.defaultPriority,
      default_reminder_offsets_minutes: normalizeOffsets(
        parsed.data.defaultReminderOffsetsMinutes,
      ),
      week_start: parsed.data.weekStart,
      default_task_view: parsed.data.defaultTaskView,
    })
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      message: "Không thể cập nhật thiết lập công việc. Vui lòng thử lại.",
    };
  }

  revalidatePath("/app/cai-dat");

  return {
    ok: true,
    message: "Đã lưu thiết lập công việc.",
  };
}

export async function updateNotificationSettings(
  input: unknown,
): Promise<SettingsActionResult> {
  const parsed = notificationSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Thiết lập thông báo không hợp lệ.",
    };
  }

  const user = await requireUser();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("user_settings")
    .update({
      notify_reminder: parsed.data.notifyReminder,
      notify_due_today: parsed.data.notifyDueToday,
      notify_overdue: parsed.data.notifyOverdue,
      notify_recurring: parsed.data.notifyRecurring,
    })
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      message: "Không thể cập nhật thiết lập thông báo. Vui lòng thử lại.",
    };
  }

  revalidatePath("/app/cai-dat");

  return {
    ok: true,
    message: "Đã lưu thiết lập thông báo.",
  };
}
