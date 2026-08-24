"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setTaskReminderOffsets } from "@/actions/reminder-actions";
import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import { suggestEisenhower } from "@/lib/tasks/eisenhower";
import {
  getTaskRecordById,
  type TaskRecord,
  type TaskRepositoryUpdateInput,
  type TaskSupabaseClient,
  updateTaskRecord,
} from "@/lib/tasks/task-repository";

type CalendarActionSuccess<T> = {
  ok: true;
  data: T;
};

type CalendarActionFailure = {
  ok: false;
  message: string;
};

export type CalendarActionResult<T> =
  | CalendarActionSuccess<T>
  | CalendarActionFailure;

type ReminderOffsetClient = {
  from(table: "task_reminders"): {
    eq(column: string, value: string): ReminderOffsetClient["from"] extends (table: "task_reminders") => infer T ? T : never;
    select(columns?: string): ReminderOffsetClient["from"] extends (table: "task_reminders") => infer T ? T : never;
  } & PromiseLike<{ data: Array<{ offset_minutes: number }> | null; error: Error | null }>;
};

const taskIdSchema = z.uuid();
const dateTimeSchema = z.string().datetime({ offset: true });
const reminderOffsetsSchema = z.array(z.number().int().min(0).max(43200)).max(8).optional();
const moveSchema = z.object({
  allDay: z.boolean(),
  dueAt: dateTimeSchema.nullable(),
  reminderOffsets: reminderOffsetsSchema,
  startAt: dateTimeSchema.nullable(),
});
const resizeSchema = z.object({
  dueAt: dateTimeSchema.nullable(),
  reminderOffsets: reminderOffsetsSchema,
  startAt: dateTimeSchema.nullable(),
});

function failure(
  message = "Không thể cập nhật lịch. Vui lòng thử lại.",
): CalendarActionFailure {
  return { ok: false, message };
}

function invalidFailure(): CalendarActionFailure {
  return failure("Thông tin lịch không hợp lệ.");
}

function parseDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

function buildScheduleUpdate(
  task: TaskRecord,
  input: {
    allDay?: boolean;
    dueAt: string | null;
    startAt: string | null;
  },
): TaskRepositoryUpdateInput {
  const update: TaskRepositoryUpdateInput = {
    dueAt: input.dueAt,
    startAt: input.startAt,
  };

  if (input.allDay !== undefined) {
    update.allDay = input.allDay;
  }

  if (!task.eisenhower_override) {
    Object.assign(
      update,
      suggestEisenhower({
        priority: task.priority,
        dueAt: parseDate(input.dueAt),
        status: task.status,
        now: new Date(),
      }),
    );
  }

  return update;
}

async function listReminderOffsets(
  supabase: ReminderOffsetClient,
  userId: string,
  taskId: string,
): Promise<number[]> {
  const { data, error } = await supabase
    .from("task_reminders")
    .select("offset_minutes")
    .eq("user_id", userId)
    .eq("task_id", taskId);

  if (error) {
    throw error;
  }

  return [...new Set((data ?? []).map((row) => row.offset_minutes))]
    .toSorted((a, b) => b - a);
}

async function updateCalendarTask(
  taskId: string,
  input: z.infer<typeof moveSchema> | z.infer<typeof resizeSchema>,
): Promise<CalendarActionResult<TaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);

  if (!parsedTaskId.success) {
    return invalidFailure();
  }

  try {
    const user = await requireUser();
    const supabase = await createServerClient();
    const taskClient = supabase as unknown as TaskSupabaseClient;
    const existingTask = await getTaskRecordById(
      taskClient,
      user.id,
      parsedTaskId.data,
    );

    if (existingTask === null) {
      return failure("Không tìm thấy công việc.");
    }

    const offsets =
      input.reminderOffsets ??
      await listReminderOffsets(
        supabase as unknown as ReminderOffsetClient,
        user.id,
        parsedTaskId.data,
      );
    const data = await updateTaskRecord(
      taskClient,
      user.id,
      parsedTaskId.data,
      buildScheduleUpdate(existingTask, input),
    );
    const reminderResult = await setTaskReminderOffsets(parsedTaskId.data, offsets);

    if (!reminderResult.ok) {
      return failure(reminderResult.message);
    }

    revalidatePath("/app/lich");
    revalidatePath("/app/cong-viec");

    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function moveCalendarTask(
  taskId: string,
  input: unknown,
): Promise<CalendarActionResult<TaskRecord>> {
  const parsed = moveSchema.safeParse(input);

  if (!parsed.success) {
    return invalidFailure();
  }

  return updateCalendarTask(taskId, parsed.data);
}

export async function resizeCalendarTask(
  taskId: string,
  input: unknown,
): Promise<CalendarActionResult<TaskRecord>> {
  const parsed = resizeSchema.safeParse(input);

  if (!parsed.success) {
    return invalidFailure();
  }

  return updateCalendarTask(taskId, parsed.data);
}
