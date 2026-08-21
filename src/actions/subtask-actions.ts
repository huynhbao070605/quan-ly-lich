"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import {
  addSubtaskRecord,
  deleteSubtaskRecord,
  getTaskRecordBySubtaskId,
  reorderSubtaskRecords,
  type SubtaskRecord,
  type SubtaskSupabaseClient,
  toggleSubtaskRecord,
} from "@/lib/tasks/subtask-repository";
import { getTaskRecordById, type TaskSupabaseClient } from "@/lib/tasks/task-repository";

type SubtaskActionSuccess<T> = {
  ok: true;
  data: T;
};

type SubtaskActionFailure = {
  ok: false;
  message: string;
};

export type SubtaskActionResult<T> = SubtaskActionSuccess<T> | SubtaskActionFailure;

const taskIdSchema = z.uuid();
const subtaskIdSchema = z.uuid();
const subtaskTitleSchema = z.string().trim().min(1).max(200);
const orderedIdsSchema = z.array(z.uuid()).min(1);

type ChecklistSupabaseClient = SubtaskSupabaseClient & TaskSupabaseClient;

function toSubtaskClient(): Promise<ChecklistSupabaseClient> {
  return createServerClient() as unknown as Promise<ChecklistSupabaseClient>;
}

function mapSubtaskError(error: unknown): SubtaskActionFailure {
  if (
    error instanceof Error &&
    (error.message === "Task not found." || error.message === "Subtask not found.")
  ) {
    return {
      ok: false,
      message: "Không tìm thấy công việc.",
    };
  }

  return {
    ok: false,
    message: "Không thể cập nhật danh sách kiểm tra. Vui lòng thử lại.",
  };
}

async function assertTaskOwner(
  supabase: ChecklistSupabaseClient,
  userId: string,
  taskId: string,
): Promise<void> {
  const task = await getTaskRecordById(supabase, userId, taskId);

  if (task === null) {
    throw new Error("Task not found.");
  }
}

async function assertSubtaskOwner(
  supabase: SubtaskSupabaseClient,
  userId: string,
  subtaskId: string,
): Promise<void> {
  const task = await getTaskRecordBySubtaskId(supabase, userId, subtaskId);

  if (task === null) {
    throw new Error("Subtask not found.");
  }
}

export async function addSubtask(
  taskId: string,
  title: string,
): Promise<SubtaskActionResult<SubtaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedTitle = subtaskTitleSchema.safeParse(title);

  if (!parsedTaskId.success || !parsedTitle.success) {
    return {
      ok: false,
      message: "Tên mục kiểm tra phải có từ 1 đến 200 ký tự.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toSubtaskClient();
    await assertTaskOwner(supabase, user.id, parsedTaskId.data);
    const data = await addSubtaskRecord(supabase, parsedTaskId.data, {
      title: parsedTitle.data,
    });

    revalidatePath("/app/cong-viec");

    return { ok: true, data };
  } catch (error) {
    return mapSubtaskError(error);
  }
}

export async function toggleSubtask(
  subtaskId: string,
  completed: boolean,
): Promise<SubtaskActionResult<SubtaskRecord>> {
  const parsedSubtaskId = subtaskIdSchema.safeParse(subtaskId);
  const parsedCompleted = z.boolean().safeParse(completed);

  if (!parsedSubtaskId.success || !parsedCompleted.success) {
    return {
      ok: false,
      message: "Mục kiểm tra không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toSubtaskClient();
    await assertSubtaskOwner(supabase, user.id, parsedSubtaskId.data);
    const data = await toggleSubtaskRecord(
      supabase,
      parsedSubtaskId.data,
      parsedCompleted.data,
    );

    revalidatePath("/app/cong-viec");

    return { ok: true, data };
  } catch (error) {
    return mapSubtaskError(error);
  }
}

export async function reorderSubtasks(
  taskId: string,
  orderedIds: string[],
): Promise<SubtaskActionResult<SubtaskRecord[]>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedOrderedIds = orderedIdsSchema.safeParse(orderedIds);

  if (!parsedTaskId.success || !parsedOrderedIds.success) {
    return {
      ok: false,
      message: "Thứ tự danh sách kiểm tra không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toSubtaskClient();
    await assertTaskOwner(supabase, user.id, parsedTaskId.data);
    const data = await reorderSubtaskRecords(
      supabase,
      parsedTaskId.data,
      parsedOrderedIds.data.map((id, position) => ({ id, position })),
    );

    revalidatePath("/app/cong-viec");

    return { ok: true, data };
  } catch (error) {
    return mapSubtaskError(error);
  }
}

export async function deleteSubtask(
  subtaskId: string,
): Promise<SubtaskActionResult<null>> {
  const parsedSubtaskId = subtaskIdSchema.safeParse(subtaskId);

  if (!parsedSubtaskId.success) {
    return {
      ok: false,
      message: "Mục kiểm tra không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toSubtaskClient();
    await assertSubtaskOwner(supabase, user.id, parsedSubtaskId.data);
    await deleteSubtaskRecord(supabase, parsedSubtaskId.data);

    revalidatePath("/app/cong-viec");

    return { ok: true, data: null };
  } catch (error) {
    return mapSubtaskError(error);
  }
}
