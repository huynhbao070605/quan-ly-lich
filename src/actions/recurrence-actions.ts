"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import {
  createRecurrenceSeries as createRecurrenceSeriesDomain,
  ensureNextOccurrence as ensureNextOccurrenceDomain,
  removeFutureRecurrence as removeFutureRecurrenceDomain,
  updateOccurrenceOnly as updateOccurrenceOnlyDomain,
  updateThisAndFuture as updateThisAndFutureDomain,
  type RecurrenceMaterializeRepository,
  type RecurrenceSeriesRecord,
  type RecurringTaskPatch,
  type RecurringTaskRecord,
} from "@/lib/recurrence/materialize";
import { recalculateReminderRows } from "@/lib/reminders/calculate";
import { createServerClient } from "@/lib/supabase/server";

type RecurrenceActionSuccess<T> = {
  ok: true;
  data: T;
};

type RecurrenceActionFailure = {
  ok: false;
  message: string;
};

export type RecurrenceActionResult<T> =
  | RecurrenceActionSuccess<T>
  | RecurrenceActionFailure;

type DbError = Error & {
  code?: string;
};

type DbResult<T> = Promise<{ data: T | null; error: DbError | null }>;
type DbListResult<T> = Promise<{ data: T[] | null; error: DbError | null }>;

type RecurrenceQueryBuilder = {
  delete(): RecurrenceQueryBuilder;
  eq(column: string, value: string): RecurrenceQueryBuilder;
  gte(column: string, value: string): RecurrenceQueryBuilder;
  insert(value: Record<string, unknown> | Array<Record<string, unknown>>): RecurrenceQueryBuilder;
  limit(count: number): RecurrenceQueryBuilder;
  maybeSingle<T = Record<string, unknown>>(): DbResult<T>;
  neq(column: string, value: string): RecurrenceQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): RecurrenceQueryBuilder;
  select(columns?: string): RecurrenceQueryBuilder;
  single<T = Record<string, unknown>>(): DbResult<T>;
  update(value: Record<string, unknown>): RecurrenceQueryBuilder;
} & PromiseLike<{ data: Array<Record<string, unknown>> | null; error: DbError | null }>;

type RecurrenceSupabaseClient = {
  from(table: string): RecurrenceQueryBuilder;
};

type RecurrenceActionRepository = RecurrenceMaterializeRepository & {
  userId: string;
};

type TaskRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: RecurringTaskRecord["status"];
  priority: RecurringTaskRecord["priority"];
  start_at: string | null;
  due_at: string | null;
  all_day: boolean;
  important: boolean;
  urgent: boolean;
  eisenhower_override: boolean;
  recurrence_series_id: string | null;
  occurrence_start_at: string | null;
  recurrence_exception: boolean;
  completed_at: string | null;
};

type SeriesRow = {
  id: string;
  user_id: string;
  source_task_id: string | null;
  frequency: RecurrenceSeriesRecord["frequency"];
  interval: number;
  weekdays: number[] | null;
  month_day: number | null;
  starts_at: string;
  ends_at: string | null;
};

const taskIdSchema = z.uuid();
const seriesIdSchema = z.uuid();
const dateTimeSchema = z.string().datetime({ offset: true });
const ruleSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.number().int().min(1),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  monthDay: z.number().int().min(1).max(31).nullable().optional(),
  endsAt: dateTimeSchema.nullable().optional(),
});
const recurrenceChangeSchema = ruleSchema.nullable();
const patchSchema = z.object({
  description: z.string().nullable().optional(),
  dueAt: dateTimeSchema.nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  startAt: dateTimeSchema.nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

function failure(
  message = "Không thể cập nhật lặp lại. Vui lòng thử lại.",
): RecurrenceActionFailure {
  return { ok: false, message };
}

function invalidFailure(): RecurrenceActionFailure {
  return failure("Thông tin lặp lại không hợp lệ.");
}

function toRule(input: z.infer<typeof ruleSchema>) {
  return {
    ...input,
    endsAt: input.endsAt === undefined || input.endsAt === null
      ? null
      : new Date(input.endsAt),
  };
}

function mapTask(row: TaskRow, reminderOffsets: number[]): RecurringTaskRecord {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    startAt: row.start_at,
    dueAt: row.due_at,
    allDay: row.all_day,
    important: row.important,
    urgent: row.urgent,
    eisenhowerOverride: row.eisenhower_override,
    recurrenceSeriesId: row.recurrence_series_id,
    occurrenceStartAt: row.occurrence_start_at,
    recurrenceException: row.recurrence_exception,
    completedAt: row.completed_at,
    reminderOffsets,
  };
}

function mapSeries(row: SeriesRow): RecurrenceSeriesRecord {
  return {
    id: row.id,
    userId: row.user_id,
    sourceTaskId: row.source_task_id,
    frequency: row.frequency,
    interval: row.interval,
    weekdays: row.weekdays,
    monthDay: row.month_day,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

function toTaskRow(input: Partial<RecurringTaskRecord>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (input.projectId !== undefined) row.project_id = input.projectId;
  if (input.title !== undefined) row.title = input.title;
  if (input.description !== undefined) row.description = input.description;
  if (input.status !== undefined) row.status = input.status;
  if (input.priority !== undefined) row.priority = input.priority;
  if (input.startAt !== undefined) row.start_at = input.startAt;
  if (input.dueAt !== undefined) row.due_at = input.dueAt;
  if (input.allDay !== undefined) row.all_day = input.allDay;
  if (input.important !== undefined) row.important = input.important;
  if (input.urgent !== undefined) row.urgent = input.urgent;
  if (input.eisenhowerOverride !== undefined) {
    row.eisenhower_override = input.eisenhowerOverride;
  }
  if (input.recurrenceSeriesId !== undefined) {
    row.recurrence_series_id = input.recurrenceSeriesId;
  }
  if (input.occurrenceStartAt !== undefined) {
    row.occurrence_start_at = input.occurrenceStartAt;
  }
  if (input.recurrenceException !== undefined) {
    row.recurrence_exception = input.recurrenceException;
  }
  if (input.completedAt !== undefined) row.completed_at = input.completedAt;

  return row;
}

function toTaskInsert(input: RecurringTaskRecord): Record<string, unknown> {
  return {
    ...toTaskRow(input),
    user_id: input.userId,
  };
}

async function assertResult<T>(
  result: { data: T | null; error: DbError | null },
  message: string,
): Promise<T> {
  if (result.error) {
    throw result.error;
  }
  if (result.data === null) {
    throw new Error(message);
  }
  return result.data;
}

async function listReminderOffsets(
  supabase: RecurrenceSupabaseClient,
  userId: string,
  taskId: string,
): Promise<number[]> {
  const result = await supabase
    .from("task_reminders")
    .select("offset_minutes")
    .eq("user_id", userId)
    .eq("task_id", taskId) as Awaited<DbListResult<{ offset_minutes: number }>>;

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).map((row) => row.offset_minutes);
}

async function insertReminderRows(
  supabase: RecurrenceSupabaseClient,
  task: RecurringTaskRecord,
): Promise<void> {
  if (task.dueAt === null || task.reminderOffsets.length === 0) {
    return;
  }

  const reminders = recalculateReminderRows(
    new Date(task.dueAt),
    task.reminderOffsets,
  ).map((reminder) => ({
    user_id: task.userId,
    task_id: task.id,
    offset_minutes: reminder.offsetMinutes,
    remind_at: reminder.remindAt.toISOString(),
  }));
  const result = await supabase.from("task_reminders").insert(reminders);

  if (result.error) {
    throw result.error;
  }
}

function createRepository(
  supabase: RecurrenceSupabaseClient,
  userId: string,
): RecurrenceActionRepository {
  return {
    userId,
    async createOccurrence(input) {
      const result = await supabase
        .from("tasks")
        .insert(toTaskInsert(input))
        .select("*")
        .single<TaskRow>();

      if (result.error?.code === "23505") {
        const existing = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .eq("recurrence_series_id", input.recurrenceSeriesId ?? "")
          .eq("occurrence_start_at", input.occurrenceStartAt ?? "")
          .maybeSingle<TaskRow>();
        const existingRow = await assertResult(existing, "Task not found.");
        return mapTask(
          existingRow,
          await listReminderOffsets(supabase, userId, existingRow.id),
        );
      }

      const row = await assertResult(result, "Task not found.");
      const task = mapTask(row, input.reminderOffsets);
      await insertReminderRows(supabase, task);
      return task;
    },
    async createSeries(input) {
      const result = await supabase
        .from("recurrence_series")
        .insert({
          user_id: input.userId,
          source_task_id: input.sourceTaskId,
          frequency: input.rule.frequency,
          interval: input.rule.interval,
          weekdays: input.rule.weekdays ?? null,
          month_day: input.rule.monthDay ?? null,
          starts_at: input.startsAt,
          ends_at: input.rule.endsAt?.toISOString() ?? null,
        })
        .select("*")
        .single<SeriesRow>();

      return mapSeries(await assertResult(result, "Series not found."));
    },
    async deleteFutureOccurrences(seriesId, fromOccurrenceStartAt) {
      const result = await supabase
        .from("tasks")
        .delete()
        .eq("user_id", userId)
        .eq("recurrence_series_id", seriesId)
        .gte("occurrence_start_at", fromOccurrenceStartAt)
        .neq("status", "DONE")
        .select("id") as Awaited<DbListResult<{ id: string }>>;

      if (result.error) {
        throw result.error;
      }

      return result.data?.length ?? 0;
    },
    async getLatestOccurrence(seriesId) {
      const result = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("recurrence_series_id", seriesId)
        .order("occurrence_start_at", { ascending: false })
        .limit(1)
        .maybeSingle<TaskRow>();

      if (result.error) {
        throw result.error;
      }
      if (result.data === null) {
        return null;
      }

      return mapTask(
        result.data,
        await listReminderOffsets(supabase, userId, result.data.id),
      );
    },
    async getSeries(seriesId) {
      const result = await supabase
        .from("recurrence_series")
        .select("*")
        .eq("user_id", userId)
        .eq("id", seriesId)
        .maybeSingle<SeriesRow>();

      if (result.error) {
        throw result.error;
      }

      return result.data === null ? null : mapSeries(result.data);
    },
    async getTask(taskId) {
      const result = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("id", taskId)
        .maybeSingle<TaskRow>();

      if (result.error) {
        throw result.error;
      }
      if (result.data === null) {
        return null;
      }

      return mapTask(
        result.data,
        await listReminderOffsets(supabase, userId, result.data.id),
      );
    },
    async listFutureOccurrences(seriesId, fromOccurrenceStartAt) {
      const result = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("recurrence_series_id", seriesId)
        .gte("occurrence_start_at", fromOccurrenceStartAt)
        .neq("status", "DONE")
        .order("occurrence_start_at", { ascending: true }) as Awaited<DbListResult<TaskRow>>;

      if (result.error) {
        throw result.error;
      }

      return Promise.all(
        (result.data ?? []).map(async (row) =>
          mapTask(row, await listReminderOffsets(supabase, userId, row.id)),
        ),
      );
    },
    async updateSeries(seriesId, patch) {
      const result = await supabase
        .from("recurrence_series")
        .update(toSeriesRow(patch))
        .eq("user_id", userId)
        .eq("id", seriesId)
        .select("*")
        .single<SeriesRow>();

      return mapSeries(await assertResult(result, "Series not found."));
    },
    async updateTask(taskId, patch) {
      const result = await supabase
        .from("tasks")
        .update(toTaskRow(patch))
        .eq("user_id", userId)
        .eq("id", taskId)
        .select("*")
        .single<TaskRow>();

      const row = await assertResult(result, "Task not found.");
      return mapTask(
        row,
        await listReminderOffsets(supabase, userId, row.id),
      );
    },
  };
}

async function createActionRepository(): Promise<RecurrenceActionRepository> {
  const user = await requireUser();
  const supabase = await createServerClient() as unknown as RecurrenceSupabaseClient;

  return createRepository(supabase, user.id);
}

function revalidateRecurrenceViews() {
  revalidatePath("/app/lich");
  revalidatePath("/app/cong-viec");
}

function recurrenceAnchor(task: RecurringTaskRecord): string {
  const anchor = task.occurrenceStartAt ?? task.startAt ?? task.dueAt;

  if (anchor === null) {
    throw new Error("Recurring task requires a start or due time.");
  }

  return anchor;
}

function isoMinusOneMillisecond(value: string): string {
  return new Date(new Date(value).getTime() - 1).toISOString();
}

function toSeriesRow(
  input: Partial<RecurrenceSeriesRecord>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (input.frequency !== undefined) row.frequency = input.frequency;
  if (input.interval !== undefined) row.interval = input.interval;
  if (input.weekdays !== undefined) row.weekdays = input.weekdays;
  if (input.monthDay !== undefined) row.month_day = input.monthDay;
  if (input.startsAt !== undefined) row.starts_at = input.startsAt;
  if (input.endsAt !== undefined) row.ends_at = input.endsAt;

  return row;
}

export async function createRecurrenceSeries(
  taskId: string,
  rule: unknown,
): Promise<RecurrenceActionResult<RecurrenceSeriesRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedRule = ruleSchema.safeParse(rule);

  if (!parsedTaskId.success || !parsedRule.success) {
    return invalidFailure();
  }

  try {
    const repository = await createActionRepository();
    const data = await createRecurrenceSeriesDomain(
      repository,
      parsedTaskId.data,
      toRule(parsedRule.data),
    );
    revalidateRecurrenceViews();
    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function setTaskRecurrence(
  taskId: string,
  rule: unknown,
): Promise<RecurrenceActionResult<RecurrenceSeriesRecord | null>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedRule = recurrenceChangeSchema.safeParse(rule);

  if (!parsedTaskId.success || !parsedRule.success) {
    return invalidFailure();
  }

  try {
    const repository = await createActionRepository();
    const task = await repository.getTask(parsedTaskId.data);

    if (task === null) {
      return failure("Không tìm thấy công việc.");
    }

    if (parsedRule.data === null) {
      if (task.recurrenceSeriesId !== null) {
        await repository.updateSeries(task.recurrenceSeriesId, {
          endsAt: task.occurrenceStartAt
            ? isoMinusOneMillisecond(task.occurrenceStartAt)
            : new Date().toISOString(),
        });
      }

      await repository.updateTask(task.id, {
        recurrenceException: false,
        recurrenceSeriesId: null,
        occurrenceStartAt: null,
      });
      revalidateRecurrenceViews();
      return { ok: true, data: null };
    }

    const nextRule = toRule(parsedRule.data);

    if (task.recurrenceSeriesId !== null) {
      const data = await repository.updateSeries(task.recurrenceSeriesId, {
        frequency: nextRule.frequency,
        interval: nextRule.interval,
        weekdays: nextRule.weekdays ?? null,
        monthDay: nextRule.monthDay ?? null,
        startsAt: recurrenceAnchor(task),
        endsAt: nextRule.endsAt?.toISOString() ?? null,
      });
      await repository.updateTask(task.id, {
        occurrenceStartAt: recurrenceAnchor(task),
        recurrenceException: false,
      });
      await ensureNextOccurrenceDomain(repository, data.id);
      revalidateRecurrenceViews();
      return { ok: true, data };
    }

    const data = await createRecurrenceSeriesDomain(
      repository,
      parsedTaskId.data,
      nextRule,
    );
    await ensureNextOccurrenceDomain(repository, data.id);
    revalidateRecurrenceViews();
    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function ensureNextOccurrence(
  seriesId: string,
): Promise<RecurrenceActionResult<RecurringTaskRecord>> {
  const parsedSeriesId = seriesIdSchema.safeParse(seriesId);

  if (!parsedSeriesId.success) {
    return invalidFailure();
  }

  try {
    const repository = await createActionRepository();
    const data = await ensureNextOccurrenceDomain(repository, parsedSeriesId.data);
    revalidateRecurrenceViews();
    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function removeFutureRecurrence(
  seriesId: string,
  fromOccurrenceStartAt: string,
): Promise<RecurrenceActionResult<number>> {
  const parsedSeriesId = seriesIdSchema.safeParse(seriesId);
  const parsedStart = dateTimeSchema.safeParse(fromOccurrenceStartAt);

  if (!parsedSeriesId.success || !parsedStart.success) {
    return invalidFailure();
  }

  try {
    const repository = await createActionRepository();
    const data = await removeFutureRecurrenceDomain(
      repository,
      parsedSeriesId.data,
      parsedStart.data,
    );
    revalidateRecurrenceViews();
    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function updateOccurrenceOnly(
  taskId: string,
  patch: unknown,
): Promise<RecurrenceActionResult<RecurringTaskRecord>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedPatch = patchSchema.safeParse(patch);

  if (!parsedTaskId.success || !parsedPatch.success) {
    return invalidFailure();
  }

  try {
    const repository = await createActionRepository();
    const data = await updateOccurrenceOnlyDomain(
      repository,
      parsedTaskId.data,
      parsedPatch.data as RecurringTaskPatch,
    );
    revalidateRecurrenceViews();
    return { ok: true, data };
  } catch {
    return failure();
  }
}

export async function updateThisAndFuture(
  taskId: string,
  patch: unknown,
): Promise<RecurrenceActionResult<{
  newSeries: RecurrenceSeriesRecord;
  updatedTasks: RecurringTaskRecord[];
}>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  const parsedPatch = patchSchema.safeParse(patch);

  if (!parsedTaskId.success || !parsedPatch.success) {
    return invalidFailure();
  }

  try {
    const repository = await createActionRepository();
    const data = await updateThisAndFutureDomain(
      repository,
      parsedTaskId.data,
      parsedPatch.data as RecurringTaskPatch,
    );
    revalidateRecurrenceViews();
    return { ok: true, data };
  } catch {
    return failure();
  }
}
