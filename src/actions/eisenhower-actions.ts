"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import {
  getTaskRecordById,
  type TaskRecord,
  type TaskSupabaseClient,
  updateTaskRecord,
} from "@/lib/tasks/task-repository";
import {
  suggestEisenhower,
  type EisenhowerFlags,
  type EisenhowerQuadrant,
} from "@/lib/tasks/eisenhower";

type EisenhowerActionSuccess<T> = {
  ok: true;
  data: T;
};

type EisenhowerActionFailure = {
  ok: false;
  message: string;
};

export type EisenhowerActionResult<T> =
  | EisenhowerActionSuccess<T>
  | EisenhowerActionFailure;

const taskIdSchema = z.uuid();
const quadrantSchema = z.enum(["DO_NOW", "SCHEDULE", "DELEGATE", "ELIMINATE"]);

const quadrantFlags: Record<EisenhowerQuadrant, EisenhowerFlags> = {
  DO_NOW: { important: true, urgent: true },
  SCHEDULE: { important: true, urgent: false },
  DELEGATE: { important: false, urgent: true },
  ELIMINATE: { important: false, urgent: false },
};

function toTaskClient(): Promise<TaskSupabaseClient> {
  return createServerClient() as unknown as Promise<TaskSupabaseClient>;
}

function parseDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

function failure(
  message = "Không thể cập nhật Eisenhower. Vui lòng thử lại.",
): EisenhowerActionFailure {
  return { ok: false, message };
}

function revalidateEisenhowerViews() {
  revalidatePath("/app/eisenhower");
  revalidatePath("/app/cong-viec");
}

export async function overrideEisenhower(
  taskId: string,
  quadrant: EisenhowerQuadrant,
): Promise<EisenhowerActionResult<TaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedQuadrant = quadrantSchema.safeParse(quadrant);

  if (!parsedTaskId.success || !parsedQuadrant.success) {
    return failure("Thông tin Eisenhower không hợp lệ.");
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();
    const data = await updateTaskRecord(supabase, user.id, parsedTaskId.data, {
      ...quadrantFlags[parsedQuadrant.data],
      eisenhowerOverride: true,
    });

    revalidateEisenhowerViews();

    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function resetEisenhower(
  taskId: string,
): Promise<EisenhowerActionResult<TaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);

  if (!parsedTaskId.success) {
    return failure("Thông tin Eisenhower không hợp lệ.");
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();
    const task = await getTaskRecordById(supabase, user.id, parsedTaskId.data);

    if (task === null) {
      return failure("Không tìm thấy công việc.");
    }

    const flags = suggestEisenhower({
      priority: task.priority,
      dueAt: parseDate(task.due_at),
      status: task.status,
      now: new Date(),
    });
    const data = await updateTaskRecord(supabase, user.id, parsedTaskId.data, {
      ...flags,
      eisenhowerOverride: false,
    });

    revalidateEisenhowerViews();

    return { ok: true, data };
  } catch {
    return failure();
  }
}
