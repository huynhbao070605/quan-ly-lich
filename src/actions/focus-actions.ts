"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
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

type FocusRpcError = {
  code?: string;
};

type FocusSupabaseClient = {
  rpc(
    fn: "set_task_focus",
    args: {
      p_task_id: string;
      p_focus_date: string;
      p_focus_position: number;
    },
  ): Promise<{ data: unknown; error: FocusRpcError | null }>;
  rpc(
    fn: "remove_task_focus",
    args: { p_task_id: string },
  ): Promise<{ data: unknown; error: FocusRpcError | null }>;
  rpc(
    fn: "reorder_task_focus",
    args: { p_focus_date: string; p_task_ids: string[] },
  ): Promise<{ data: unknown; error: FocusRpcError | null }>;
};

const taskIdSchema = z.uuid();
const focusDateSchema = z.string().date();
const focusPositionSchema = z.number().int().min(1).max(3);
const orderedTaskIdsSchema = z
  .array(taskIdSchema)
  .max(3)
  .refine((taskIds) => new Set(taskIds).size === taskIds.length);
const maxFocusMessage =
  "Bạn chỉ có thể chọn tối đa 3 công việc trọng tâm mỗi ngày.";

function toFocusClient(): Promise<FocusSupabaseClient> {
  return createServerClient() as unknown as Promise<FocusSupabaseClient>;
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
): Promise<FocusActionResult<null>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedDate = focusDateSchema.safeParse(date);
  const parsedPosition = focusPositionSchema.safeParse(position);

  if (!parsedTaskId.success || !parsedDate.success || !parsedPosition.success) {
    return failure("Thông tin trọng tâm không hợp lệ.");
  }

  try {
    await requireUser();
    const supabase = await toFocusClient();
    const { error } = await supabase.rpc("set_task_focus", {
      p_task_id: parsedTaskId.data,
      p_focus_date: parsedDate.data,
      p_focus_position: parsedPosition.data,
    });

    if (error?.code === "23505") {
      return failure(maxFocusMessage);
    }
    if (error) {
      return failure();
    }

    revalidateDailyPlan();
    return { ok: true, data: null };
  } catch {
    return failure();
  }
}

export async function removeFocus(
  taskId: string,
): Promise<FocusActionResult<null>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);

  if (!parsedTaskId.success) {
    return failure("Thông tin trọng tâm không hợp lệ.");
  }

  try {
    await requireUser();
    const supabase = await toFocusClient();
    const { error } = await supabase.rpc("remove_task_focus", {
      p_task_id: parsedTaskId.data,
    });

    if (error) {
      return failure();
    }

    revalidateDailyPlan();
    return { ok: true, data: null };
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
    await requireUser();
    const supabase = await toFocusClient();
    const { error } = await supabase.rpc("reorder_task_focus", {
      p_focus_date: parsedDate.data,
      p_task_ids: parsedTaskIds.data,
    });

    if (error) {
      return failure();
    }

    revalidateDailyPlan();
    return { ok: true, data: null };
  } catch {
    return failure();
  }
}
