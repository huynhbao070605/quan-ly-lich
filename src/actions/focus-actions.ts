"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { countFocusTasks, type FocusSupabaseClient } from "@/lib/tasks/focus";
import {
  type TaskRecord,
  type TaskSupabaseClient,
  updateTaskRecord,
} from "@/lib/tasks/task-repository";
import { createServerClient } from "@/lib/supabase/server";

type FocusActionSuccess<T> = {
  ok: true;
  data: T;
};

type FocusActionFailure = {
  ok: false;
  message: string;
};

export type FocusActionResult<T> = FocusActionSuccess<T> | FocusActionFailure;

const taskIdSchema = z.uuid();
const focusDateSchema = z.string().date();
const focusPositionSchema = z.number().int().min(1).max(3);
const orderedTaskIdsSchema = z.array(taskIdSchema).max(3);
const maxFocusMessage = "Bạn chỉ có thể chọn tối đa 3 công việc trọng tâm mỗi ngày.";

function toTaskClient(): Promise<TaskSupabaseClient> {
  return createServerClient() as unknown as Promise<TaskSupabaseClient>;
}

function failure(
  message = "Không thể cập nhật trọng tâm. Vui lòng thử lại.",
): FocusActionFailure {
  return { ok: false, message };
}

function revalidateDailyPlan() {
  revalidatePath("/app/ke-hoach-ngay");
  revalidatePath("/app/cong-viec");
}

export async function setFocus(
  taskId: string,
  date: string,
  position: number,
): Promise<FocusActionResult<TaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedDate = focusDateSchema.safeParse(date);
  const parsedPosition = focusPositionSchema.safeParse(position);

  if (!parsedTaskId.success || !parsedDate.success || !parsedPosition.success) {
    return failure("Thông tin trọng tâm không hợp lệ.");
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();
    const count = await countFocusTasks(
      supabase as unknown as FocusSupabaseClient,
      user.id,
      parsedDate.data,
      parsedTaskId.data,
    );

    if (count >= 3) {
      return failure(maxFocusMessage);
    }

    const data = await updateTaskRecord(supabase, user.id, parsedTaskId.data, {
      focusDate: parsedDate.data,
      focusPosition: parsedPosition.data,
    });

    revalidateDailyPlan();

    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function removeFocus(taskId: string): Promise<FocusActionResult<TaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);

  if (!parsedTaskId.success) {
    return failure("Thông tin trọng tâm không hợp lệ.");
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();
    const data = await updateTaskRecord(supabase, user.id, parsedTaskId.data, {
      focusDate: null,
      focusPosition: null,
    });

    revalidateDailyPlan();

    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function reorderFocus(
  date: string,
  orderedTaskIds: string[],
): Promise<FocusActionResult<null>> {
  const parsedDate = focusDateSchema.safeParse(date);
  const parsedTaskIds = orderedTaskIdsSchema.safeParse(orderedTaskIds);

  if (!parsedDate.success || !parsedTaskIds.success) {
    return failure("Thông tin trọng tâm không hợp lệ.");
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();

    await Promise.all(
      parsedTaskIds.data.map((taskId, index) =>
        updateTaskRecord(supabase, user.id, taskId, {
          focusDate: parsedDate.data,
          focusPosition: index + 1,
        }),
      ),
    );

    revalidateDailyPlan();

    return { ok: true, data: null };
  } catch {
    return failure();
  }
}
