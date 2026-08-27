import type { RecurrenceFrequency, RecurrenceRule } from "./types";
import { nextOccurrence } from "./next-occurrence";

export type RecurringTaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELLED";

export type RecurringTaskRecord = {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: RecurringTaskStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  important: boolean;
  urgent: boolean;
  eisenhowerOverride: boolean;
  recurrenceSeriesId: string | null;
  occurrenceStartAt: string | null;
  recurrenceException: boolean;
  completedAt: string | null;
  reminderOffsets: number[];
};

export type RecurrenceSeriesRecord = {
  id: string;
  userId: string;
  sourceTaskId: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays: number[] | null;
  monthDay: number | null;
  startsAt: string;
  endsAt: string | null;
};

export type RecurringTaskPatch = Partial<
  Pick<
    RecurringTaskRecord,
    "description" | "dueAt" | "priority" | "startAt" | "title"
  >
>;

export type RecurrenceMaterializeRepository = {
  createOccurrence(input: RecurringTaskRecord): Promise<RecurringTaskRecord>;
  createSeries(input: {
    userId: string;
    sourceTaskId: string;
    rule: RecurrenceRule;
    startsAt: string;
  }): Promise<RecurrenceSeriesRecord>;
  deleteFutureOccurrences(
    seriesId: string,
    fromOccurrenceStartAt: string,
  ): Promise<number>;
  getLatestOccurrence(seriesId: string): Promise<RecurringTaskRecord | null>;
  getSeries(seriesId: string): Promise<RecurrenceSeriesRecord | null>;
  getTask(taskId: string): Promise<RecurringTaskRecord | null>;
  listFutureOccurrences(
    seriesId: string,
    fromOccurrenceStartAt: string,
  ): Promise<RecurringTaskRecord[]>;
  updateSeries(
    seriesId: string,
    patch: Partial<
      Pick<
        RecurrenceSeriesRecord,
        "endsAt" | "frequency" | "interval" | "monthDay" | "startsAt" | "weekdays"
      >
    >,
  ): Promise<RecurrenceSeriesRecord>;
  updateTask(
    taskId: string,
    patch: Partial<RecurringTaskRecord>,
  ): Promise<RecurringTaskRecord>;
};

const TIMEZONE = "Asia/Ho_Chi_Minh";

function assertFound<T>(
  value: T | null,
  message: string,
): T {
  if (value === null) {
    throw new Error(message);
  }

  return value;
}

function toRule(series: RecurrenceSeriesRecord): RecurrenceRule {
  return {
    frequency: series.frequency,
    interval: series.interval,
    weekdays: series.weekdays ?? undefined,
    monthDay: series.monthDay,
    endsAt: series.endsAt === null ? null : new Date(series.endsAt),
  };
}

function isoMinusOneMillisecond(value: string): string {
  return new Date(new Date(value).getTime() - 1).toISOString();
}

function addMilliseconds(
  value: string | null,
  milliseconds: number,
): string | null {
  if (value === null) {
    return null;
  }

  return new Date(new Date(value).getTime() + milliseconds).toISOString();
}

function shiftPatchForFutureOccurrence(
  task: RecurringTaskRecord,
  selectedOccurrenceStartAt: string,
  newSeriesStartsAt: string,
  patch: RecurringTaskPatch,
): RecurringTaskPatch & Pick<
  RecurringTaskRecord,
  "occurrenceStartAt" | "recurrenceException" | "recurrenceSeriesId"
> {
  const selectedTime = new Date(selectedOccurrenceStartAt).getTime();
  const taskOccurrenceTime = new Date(
    task.occurrenceStartAt ?? selectedOccurrenceStartAt,
  ).getTime();
  const occurrenceOffset = taskOccurrenceTime - selectedTime;
  const shiftedOccurrenceStartAt = new Date(
    new Date(newSeriesStartsAt).getTime() + occurrenceOffset,
  ).toISOString();

  const shiftedPatch: RecurringTaskPatch & Pick<
    RecurringTaskRecord,
    "occurrenceStartAt" | "recurrenceException" | "recurrenceSeriesId"
  > = {
    ...patch,
    occurrenceStartAt: shiftedOccurrenceStartAt,
    recurrenceException: false,
    recurrenceSeriesId: "",
  };

  if (patch.startAt !== undefined) {
    shiftedPatch.startAt =
      task.id === undefined
        ? patch.startAt
        : addMilliseconds(patch.startAt, occurrenceOffset);
  }

  if (patch.dueAt !== undefined) {
    shiftedPatch.dueAt = addMilliseconds(patch.dueAt, occurrenceOffset);
  }

  return shiftedPatch;
}

function cloneForOccurrence(
  source: RecurringTaskRecord,
  occurrenceStartAt: string,
): RecurringTaskRecord {
  const sourceAnchor = source.occurrenceStartAt ?? source.startAt ?? source.dueAt;
  const offset =
    sourceAnchor === null
      ? 0
      : new Date(occurrenceStartAt).getTime() - new Date(sourceAnchor).getTime();

  return {
    ...source,
    id: "",
    startAt: addMilliseconds(source.startAt, offset),
    dueAt: addMilliseconds(source.dueAt, offset),
    recurrenceSeriesId: source.recurrenceSeriesId,
    occurrenceStartAt,
    recurrenceException: false,
    completedAt: null,
  };
}

export async function createRecurrenceSeries(
  repository: RecurrenceMaterializeRepository,
  taskId: string,
  rule: RecurrenceRule,
): Promise<RecurrenceSeriesRecord> {
  const task = assertFound(
    await repository.getTask(taskId),
    "Task not found.",
  );
  const startsAt =
    task.occurrenceStartAt ?? task.startAt ?? task.dueAt;

  if (startsAt === null) {
    throw new Error("Recurring task requires a start or due time.");
  }

  const series = await repository.createSeries({
    userId: task.userId,
    sourceTaskId: task.id,
    rule,
    startsAt,
  });

  await repository.updateTask(task.id, {
    recurrenceSeriesId: series.id,
    occurrenceStartAt: startsAt,
    recurrenceException: false,
  });

  return series;
}

export async function ensureNextOccurrence(
  repository: RecurrenceMaterializeRepository,
  seriesId: string,
): Promise<RecurringTaskRecord> {
  const series = assertFound(
    await repository.getSeries(seriesId),
    "Series not found.",
  );
  const source = assertFound(
    await repository.getLatestOccurrence(seriesId),
    "Source occurrence not found.",
  );
  const next = nextOccurrence(
    toRule(series),
    new Date(series.startsAt),
    TIMEZONE,
  );

  if (next === null || (series.endsAt !== null && next > new Date(series.endsAt))) {
    throw new Error("No next occurrence.");
  }

  return repository.createOccurrence(
    cloneForOccurrence(source, next.toISOString()),
  );
}

export async function removeFutureRecurrence(
  repository: RecurrenceMaterializeRepository,
  seriesId: string,
  fromOccurrenceStartAt: string,
): Promise<number> {
  await repository.updateSeries(seriesId, {
    endsAt: isoMinusOneMillisecond(fromOccurrenceStartAt),
  });

  return repository.deleteFutureOccurrences(seriesId, fromOccurrenceStartAt);
}

export async function updateOccurrenceOnly(
  repository: RecurrenceMaterializeRepository,
  taskId: string,
  patch: RecurringTaskPatch,
): Promise<RecurringTaskRecord> {
  await assertFound(
    await repository.getTask(taskId),
    "Task not found.",
  );

  return repository.updateTask(taskId, {
    ...patch,
    recurrenceException: true,
  });
}

export async function updateThisAndFuture(
  repository: RecurrenceMaterializeRepository,
  taskId: string,
  patch: RecurringTaskPatch,
): Promise<{
  newSeries: RecurrenceSeriesRecord;
  updatedTasks: RecurringTaskRecord[];
}> {
  const selected = assertFound(
    await repository.getTask(taskId),
    "Task not found.",
  );
  const seriesId = assertFound(
    selected.recurrenceSeriesId,
    "Task is not recurring.",
  );
  const selectedOccurrenceStartAt = assertFound(
    selected.occurrenceStartAt,
    "Task occurrence is missing.",
  );
  const oldSeries = assertFound(
    await repository.getSeries(seriesId),
    "Series not found.",
  );

  await repository.updateSeries(oldSeries.id, {
    endsAt: isoMinusOneMillisecond(selectedOccurrenceStartAt),
  });

  const newSeriesStartsAt =
    patch.startAt ?? selected.startAt ?? selectedOccurrenceStartAt;
  const newSeries = await repository.createSeries({
    userId: selected.userId,
    sourceTaskId: selected.id,
    rule: {
      frequency: oldSeries.frequency,
      interval: oldSeries.interval,
      weekdays: oldSeries.weekdays ?? undefined,
      monthDay: oldSeries.monthDay,
      endsAt: oldSeries.endsAt === null ? null : new Date(oldSeries.endsAt),
    },
    startsAt: newSeriesStartsAt,
  });
  const futureOccurrences = await repository.listFutureOccurrences(
    oldSeries.id,
    selectedOccurrenceStartAt,
  );
  const updatedTasks: RecurringTaskRecord[] = [];

  for (const task of futureOccurrences) {
    const shiftedPatch = shiftPatchForFutureOccurrence(
      task,
      selectedOccurrenceStartAt,
      newSeriesStartsAt,
      patch,
    );

    updatedTasks.push(
      await repository.updateTask(task.id, {
        ...shiftedPatch,
        recurrenceSeriesId: newSeries.id,
      }),
    );
  }

  return {
    newSeries,
    updatedTasks,
  };
}
