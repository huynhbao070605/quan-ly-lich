"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import { taskStatusSchema, type TaskStatus } from "@/lib/validation/task";

type KanbanActionSuccess<T> = {
  ok: true;
  data: T;
};

type KanbanActionFailure = {
  ok: false;
  message: string;
};

export type KanbanActionResult<T> = KanbanActionSuccess<T> | KanbanActionFailure;

type KanbanTaskRecord = {
  id: string;
  user_id: string;
  status: TaskStatus;
  kanban_position: number;
  completed_at: string | null;
};

type SupabaseMutationResult<T> = Promise<{ data: T | null; error: Error | null }>;
type SupabaseRpcResult = Promise<{ data: unknown; error: Error | null }>;

type KanbanQueryBuilder<T> = {
  eq(column: string, value: string): KanbanQueryBuilder<T>;
  select(columns?: string): KanbanQueryBuilder<T>;
  single(): SupabaseMutationResult<T>;
  update(value: Record<string, unknown>): KanbanQueryBuilder<T>;
};

type KanbanSupabaseClient = {
  from(table: "tasks"): KanbanQueryBuilder<KanbanTaskRecord>;
  rpc(
    fn: "reorder_kanban_column",
    args: { p_status: TaskStatus; p_task_ids: string[] },
  ): SupabaseRpcResult;
};

const taskIdSchema = z.uuid();
const positionSchema = z.number().finite();
const reorderSchema = z.object({
  status: taskStatusSchema,
  taskIds: z.array(taskIdSchema),
});

function toKanbanClient(): Promise<KanbanSupabaseClient> {
  return createServerClient() as unknown as Promise<KanbanSupabaseClient>;
}

function failure(message = "Không thể cập nhật công việc. Vui lòng thử lại."): KanbanActionFailure {
  return { ok: false, message };
}

function completedAtForStatus(status: TaskStatus): string | null {
  return status === "DONE" ? new Date().toISOString() : null;
}

export async function moveTask(
  taskId: string,
  status: TaskStatus,
  position: number,
): Promise<KanbanActionResult<KanbanTaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedStatus = taskStatusSchema.safeParse(status);
  const parsedPosition = positionSchema.safeParse(position);

  if (!parsedTaskId.success || !parsedStatus.success || !parsedPosition.success) {
    return failure("Thông tin Kanban không hợp lệ.");
  }

  try {
    const user = await requireUser();
    const supabase = await toKanbanClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({
        status: parsedStatus.data,
        kanban_position: parsedPosition.data,
        completed_at: completedAtForStatus(parsedStatus.data),
      })
      .eq("user_id", user.id)
      .eq("id", parsedTaskId.data)
      .select("id, user_id, status, kanban_position, completed_at")
      .single();

    if (error || data === null) {
      return failure();
    }

    revalidatePath("/app/kanban");
    revalidatePath("/app/cong-viec");

    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function reorderColumn(
  status: TaskStatus,
  taskIds: string[],
): Promise<KanbanActionResult<null>> {
  const parsed = reorderSchema.safeParse({ status, taskIds });

  if (!parsed.success) {
    return failure("Thông tin Kanban không hợp lệ.");
  }

  try {
    await requireUser();
    const supabase = await toKanbanClient();
    const { error } = await supabase.rpc("reorder_kanban_column", {
      p_status: parsed.data.status,
      p_task_ids: parsed.data.taskIds,
    });

    if (error) {
      return failure();
    }

    revalidatePath("/app/kanban");
    revalidatePath("/app/cong-viec");

    return { ok: true, data: null };
  } catch {
    return failure();
  }
}
