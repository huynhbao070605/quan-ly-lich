"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import {
  createTaskRecord,
  deleteTaskRecord,
  getTaskRecordById,
  type TaskRecord,
  type TaskRepositoryCreateInput,
  type TaskRepositoryUpdateInput,
  type TaskSupabaseClient,
  updateTaskRecord,
} from "@/lib/tasks/task-repository";
import { suggestEisenhower } from "@/lib/tasks/eisenhower";
import {
  createTaskSchema,
  taskStatusSchema,
  updateTaskSchema,
  type TaskPriority,
  type TaskStatus,
  type UpdateTaskInput,
} from "@/lib/validation/task";

type TaskActionSuccess<T> = {
  ok: true;
  data: T;
};

type TaskActionFailure = {
  ok: false;
  message: string;
};

export type TaskActionResult<T> = TaskActionSuccess<T> | TaskActionFailure;

const taskIdSchema = z.uuid();

function toTaskClient(): Promise<TaskSupabaseClient> {
  return createServerClient() as unknown as Promise<TaskSupabaseClient>;
}

function parseDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

function buildAutoEisenhowerUpdate(
  existingTask: TaskRecord,
  input: TaskRepositoryUpdateInput,
): Pick<TaskRepositoryUpdateInput, "important" | "urgent"> {
  if (existingTask.eisenhower_override) {
    return {};
  }

  if (
    input.priority === undefined &&
    input.dueAt === undefined &&
    input.status === undefined
  ) {
    return {};
  }

  const flags = suggestEisenhower({
    priority: input.priority ?? existingTask.priority,
    dueAt: input.dueAt !== undefined ? parseDate(input.dueAt) : parseDate(existingTask.due_at),
    status: input.status ?? existingTask.status,
    now: new Date(),
  });

  return flags;
}

function buildStatusUpdate(
  existingTask: TaskRecord,
  status: TaskStatus,
): TaskRepositoryUpdateInput {
  return {
    status,
    completedAt:
      status === "DONE"
        ? existingTask.status === "DONE" && existingTask.completed_at !== null
          ? existingTask.completed_at
          : new Date().toISOString()
        : null,
  };
}

function buildRepositoryUpdate(
  existingTask: TaskRecord,
  input: UpdateTaskInput,
): TaskRepositoryUpdateInput {
  const statusUpdate =
    input.status === undefined ? {} : buildStatusUpdate(existingTask, input.status);
  const update = {
    ...input,
    ...statusUpdate,
  };

  return {
    ...update,
    ...buildAutoEisenhowerUpdate(existingTask, update),
  };
}

function mapTaskError(error: unknown): TaskActionFailure {
  if (error instanceof Error && error.message === "Task not found.") {
    return {
      ok: false,
      message: "Không tìm thấy công việc.",
    };
  }

  return {
    ok: false,
    message: "Không thể cập nhật công việc. Vui lòng thử lại.",
  };
}

export async function createTask(input: unknown): Promise<TaskActionResult<TaskRecord>> {
  const parsed = createTaskSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Thông tin công việc không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();
    const status = parsed.data.status ?? "TODO";
    const priority = parsed.data.priority ?? "MEDIUM";
    const flags = suggestEisenhower({
      priority,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      status,
      now: new Date(),
    });
    const createInput: TaskRepositoryCreateInput = {
      ...parsed.data,
      status,
      priority,
      ...flags,
      eisenhowerOverride: false,
      completedAt: status === "DONE" ? new Date().toISOString() : null,
    };
    const data = await createTaskRecord(supabase, user.id, createInput);

    revalidatePath("/app/cong-viec");

    return { ok: true, data };
  } catch (error) {
    return mapTaskError(error);
  }
}

export async function updateTask(
  taskId: string,
  input: unknown,
): Promise<TaskActionResult<TaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsed = updateTaskSchema.safeParse(input);

  if (!parsedTaskId.success || !parsed.success) {
    return {
      ok: false,
      message: "Thông tin công việc không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();
    const existingTask = await getTaskRecordById(supabase, user.id, parsedTaskId.data);

    if (existingTask === null) {
      return {
        ok: false,
        message: "Không tìm thấy công việc.",
      };
    }

    const data = await updateTaskRecord(
      supabase,
      user.id,
      parsedTaskId.data,
      buildRepositoryUpdate(existingTask, parsed.data),
    );

    revalidatePath("/app/cong-viec");

    return { ok: true, data };
  } catch (error) {
    return mapTaskError(error);
  }
}

export async function deleteTask(taskId: string): Promise<TaskActionResult<null>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);

  if (!parsedTaskId.success) {
    return {
      ok: false,
      message: "Mã công việc không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();
    await deleteTaskRecord(supabase, user.id, parsedTaskId.data);

    revalidatePath("/app/cong-viec");

    return { ok: true, data: null };
  } catch (error) {
    return mapTaskError(error);
  }
}

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<TaskActionResult<TaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedStatus = taskStatusSchema.safeParse(status);

  if (!parsedTaskId.success || !parsedStatus.success) {
    return {
      ok: false,
      message: "Trạng thái công việc không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();
    const existingTask = await getTaskRecordById(supabase, user.id, parsedTaskId.data);

    if (existingTask === null) {
      return {
        ok: false,
        message: "Không tìm thấy công việc.",
      };
    }

    const data = await updateTaskRecord(
      supabase,
      user.id,
      parsedTaskId.data,
      buildRepositoryUpdate(existingTask, { status: parsedStatus.data }),
    );

    revalidatePath("/app/cong-viec");

    return { ok: true, data };
  } catch (error) {
    return mapTaskError(error);
  }
}

export async function getTaskById(
  taskId: string,
): Promise<TaskActionResult<TaskRecord | null>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);

  if (!parsedTaskId.success) {
    return {
      ok: false,
      message: "Mã công việc không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toTaskClient();
    const data = await getTaskRecordById(supabase, user.id, parsedTaskId.data);

    return { ok: true, data };
  } catch (error) {
    return mapTaskError(error);
  }
}

export type { TaskPriority, TaskStatus };
