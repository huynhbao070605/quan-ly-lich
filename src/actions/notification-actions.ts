"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";

export type NotificationRecord = {
  createdAt: string;
  id: string;
  message: string;
  readAt: string | null;
  taskDeleted: boolean;
  taskId: string | null;
  title: string;
  type: "REMINDER" | "DUE_TODAY" | "OVERDUE" | "RECURRING_CREATED";
};

type NotificationActionSuccess<T> = {
  ok: true;
  data: T;
};

type NotificationActionFailure = {
  ok: false;
  message: string;
};

export type NotificationActionResult<T> =
  | NotificationActionSuccess<T>
  | NotificationActionFailure;

type NotificationRow = {
  created_at: string;
  id: string;
  message: string;
  read_at: string | null;
  task_id: string | null;
  tasks: { id: string } | null;
  title: string;
  type: NotificationRecord["type"];
};

type NotificationQueryBuilder<T = Record<string, unknown>> = {
  delete(): NotificationQueryBuilder<T>;
  eq(column: string, value: string): NotificationQueryBuilder<T>;
  is(column: string, value: null): NotificationQueryBuilder<T>;
  not(column: string, operator: string, value: string): NotificationQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): Promise<{ data: T[] | null; error: Error | null }>;
  select(columns?: string): NotificationQueryBuilder<T>;
  update(value: Record<string, unknown>): NotificationQueryBuilder<T>;
} & PromiseLike<{ error: Error | null }>;

type NotificationSupabaseClient = {
  from(table: "notifications"): NotificationQueryBuilder<NotificationRow>;
};

const notificationIdSchema = z.uuid();
const selectColumns = "id,task_id,type,title,message,read_at,created_at,tasks(id)";

function failure(
  message = "Không thể cập nhật thông báo. Vui lòng thử lại.",
): NotificationActionFailure {
  return { ok: false, message };
}

function invalidFailure(): NotificationActionFailure {
  return failure("Thông báo không hợp lệ.");
}

async function toNotificationClient(): Promise<{
  supabase: NotificationSupabaseClient;
  userId: string;
}> {
  const user = await requireUser();
  const supabase = await createServerClient() as unknown as NotificationSupabaseClient;

  return { supabase, userId: user.id };
}

function mapNotification(row: NotificationRow): NotificationRecord {
  return {
    createdAt: row.created_at,
    id: row.id,
    message: row.message,
    readAt: row.read_at,
    taskDeleted: row.task_id !== null && row.tasks === null,
    taskId: row.task_id,
    title: row.title,
    type: row.type,
  };
}

function revalidateNotifications() {
  revalidatePath("/app/thong-bao");
  revalidatePath("/app/cong-viec");
}

export async function listNotifications(): Promise<
  NotificationActionResult<NotificationRecord[]>
> {
  try {
    const { supabase, userId } = await toNotificationClient();
    const { data, error } = await supabase
      .from("notifications")
      .select(selectColumns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return failure();
    }

    return { ok: true, data: (data ?? []).map(mapNotification) };
  } catch {
    return failure();
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationActionResult<null>> {
  const parsed = notificationIdSchema.safeParse(notificationId);

  if (!parsed.success) {
    return invalidFailure();
  }

  try {
    const { supabase, userId } = await toNotificationClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", parsed.data);

    if (error) {
      return failure();
    }

    revalidateNotifications();
    return { ok: true, data: null };
  } catch {
    return failure();
  }
}

export async function markAllNotificationsRead(): Promise<
  NotificationActionResult<null>
> {
  try {
    const { supabase, userId } = await toNotificationClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      return failure();
    }

    revalidateNotifications();
    return { ok: true, data: null };
  } catch {
    return failure();
  }
}

export async function deleteNotification(
  notificationId: string,
): Promise<NotificationActionResult<null>> {
  const parsed = notificationIdSchema.safeParse(notificationId);

  if (!parsed.success) {
    return invalidFailure();
  }

  try {
    const { supabase, userId } = await toNotificationClient();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("id", parsed.data);

    if (error) {
      return failure();
    }

    revalidateNotifications();
    return { ok: true, data: null };
  } catch {
    return failure();
  }
}

export async function clearReadNotifications(): Promise<
  NotificationActionResult<null>
> {
  try {
    const { supabase, userId } = await toNotificationClient();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .not("read_at", "is", "null");

    if (error) {
      return failure();
    }

    revalidateNotifications();
    return { ok: true, data: null };
  } catch {
    return failure();
  }
}
