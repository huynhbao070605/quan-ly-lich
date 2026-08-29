"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { recalculateReminderRows } from "@/lib/reminders/calculate";
import { createServerClient } from "@/lib/supabase/server";

type ReminderActionSuccess<T> = {
  ok: true;
  data: T;
};

type ReminderActionFailure = {
  ok: false;
  message: string;
};

export type ReminderActionResult<T> =
  | ReminderActionSuccess<T>
  | ReminderActionFailure;

type ReminderQueryBuilder = {
  delete(): ReminderQueryBuilder;
  eq(column: string, value: string): ReminderQueryBuilder;
  gte(column: string, value: string): ReminderQueryBuilder;
  insert(value: Record<string, unknown>[]): Promise<{ error: Error | null }>;
  is(column: string, value: null): ReminderQueryBuilder;
  maybeSingle<T>(): Promise<{ data: T | null; error: Error | null }>;
  select(columns?: string): ReminderQueryBuilder;
  update(value: Record<string, unknown>): ReminderQueryBuilder;
} & PromiseLike<{ error: Error | null }>;

type ReminderSupabaseClient = {
  from(table: string): ReminderQueryBuilder;
};

type TaskDueRow = {
  id: string;
  due_at: string | null;
};

const taskIdSchema = z.uuid();
const offsetsSchema = z.array(z.number().int().min(0).max(43200)).max(8);

function failure(
  message = "Không thể cập nhật nhắc việc. Vui lòng thử lại.",
): ReminderActionFailure {
  return { ok: false, message };
}

function invalidFailure(): ReminderActionFailure {
  return failure("Thông tin nhắc việc không hợp lệ.");
}

function normalizeOffsets(offsets: number[]): number[] {
  return [...new Set(offsets)].toSorted((a, b) => b - a);
}

async function toReminderClient(): Promise<{
  supabase: ReminderSupabaseClient;
  userId: string;
}> {
  const user = await requireUser();
  const supabase = await createServerClient() as unknown as ReminderSupabaseClient;

  return { supabase, userId: user.id };
}

async function getOwnedTaskDueAt(
  supabase: ReminderSupabaseClient,
  userId: string,
  taskId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, due_at")
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle<TaskDueRow>();

  if (error) {
    throw error;
  }
  if (data === null) {
    throw new Error("Task not found.");
  }

  return data.due_at;
}

async function deletePendingFutureReminders(
  supabase: ReminderSupabaseClient,
  userId: string,
  taskId: string,
  now: Date,
): Promise<void> {
  const { error } = await supabase
    .from("task_reminders")
    .delete()
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .is("triggered_at", null)
    .gte("remind_at", now.toISOString());

  if (error) {
    throw error;
  }
}

async function insertReminderRows(
  supabase: ReminderSupabaseClient,
  userId: string,
  taskId: string,
  dueAt: string | null,
  offsets: number[],
): Promise<void> {
  if (dueAt === null || offsets.length === 0) {
    return;
  }

  const rows = recalculateReminderRows(
    new Date(dueAt),
    offsets,
  ).map((row) => ({
    user_id: userId,
    task_id: taskId,
    offset_minutes: row.offsetMinutes,
    remind_at: row.remindAt.toISOString(),
  }));
  const { error } = await supabase
    .from("task_reminders")
    .insert(rows);

  if (error) {
    throw error;
  }
}

export async function setTaskReminderOffsets(
  taskId: string,
  offsets: unknown,
): Promise<ReminderActionResult<null>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedOffsets = offsetsSchema.safeParse(offsets);

  if (!parsedTaskId.success || !parsedOffsets.success) {
    return invalidFailure();
  }

  try {
    const { supabase, userId } = await toReminderClient();
    const normalizedOffsets = normalizeOffsets(parsedOffsets.data);
    const dueAt = await getOwnedTaskDueAt(supabase, userId, parsedTaskId.data);
    await deletePendingFutureReminders(
      supabase,
      userId,
      parsedTaskId.data,
      new Date(),
    );
    await insertReminderRows(
      supabase,
      userId,
      parsedTaskId.data,
      dueAt,
      normalizedOffsets,
    );

    revalidatePath("/app/cong-viec");
    revalidatePath("/app/lich");

    return { ok: true, data: null };
  } catch {
    return failure();
  }
}

export async function setDefaultReminderOffsets(
  offsets: unknown,
): Promise<ReminderActionResult<null>> {
  const parsedOffsets = offsetsSchema.safeParse(offsets);

  if (!parsedOffsets.success) {
    return invalidFailure();
  }

  try {
    const { supabase, userId } = await toReminderClient();
    const normalizedOffsets = normalizeOffsets(parsedOffsets.data);
    const { error } = await supabase
      .from("user_settings")
      .update({ default_reminder_offsets_minutes: normalizedOffsets })
      .eq("user_id", userId);

    if (error) {
      return failure();
    }

    revalidatePath("/app/cai-dat");
    return { ok: true, data: null };
  } catch {
    return failure();
  }
}
