import { isInVietnamDay, isOverdue } from "@/lib/domain/time";
import type { TaskStatus } from "@/lib/validation/task";

export type DailyPlanTask = {
  id: string;
  title: string;
  status: TaskStatus;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  completedAt: string | null;
  focusDate: string | null;
  focusPosition: number | null;
};

export type DailyPlanGroups<T extends DailyPlanTask = DailyPlanTask> = {
  focus: T[];
  overdue: T[];
  today: T[];
  allDay: T[];
  completed: T[];
};

function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

function isClosed(status: TaskStatus): boolean {
  return status === "DONE" || status === "CANCELLED";
}

export function vietnamDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function isTaskInDailyPlan(task: DailyPlanTask, date: Date): boolean {
  const dueAt = toDate(task.dueAt);
  const startAt = toDate(task.startAt);
  const completedAt = toDate(task.completedAt);

  if (task.status === "DONE") {
    return completedAt !== null && isInVietnamDay(completedAt, date);
  }

  if (task.status === "CANCELLED") {
    return false;
  }

  return (
    (dueAt !== null && isInVietnamDay(dueAt, date)) ||
    (startAt !== null && isInVietnamDay(startAt, date)) ||
    isOverdue({ dueAt, status: task.status, now: date })
  );
}

function byFocusPosition<T extends DailyPlanTask>(a: T, b: T): number {
  return (a.focusPosition ?? 0) - (b.focusPosition ?? 0);
}

export function groupDailyPlanTasks<T extends DailyPlanTask>(
  tasks: T[],
  date: Date,
): DailyPlanGroups<T> {
  const dateKey = vietnamDateKey(date);
  const included = tasks.filter((task) => isTaskInDailyPlan(task, date));
  const isFocusTask = (task: T) =>
    task.focusDate === dateKey && task.focusPosition !== null;
  const isOverdueForDailyPlan = (task: T) => {
    const dueAt = toDate(task.dueAt);

    if (task.allDay && dueAt !== null && isInVietnamDay(dueAt, date)) {
      return false;
    }

    return isOverdue({
      dueAt,
      status: task.status,
      now: date,
    });
  };

  return {
    focus: included
      .filter(isFocusTask)
      .sort(byFocusPosition),
    overdue: included.filter(
      (task) => !isFocusTask(task) && isOverdueForDailyPlan(task),
    ),
    today: included.filter((task) => {
      if (isFocusTask(task) || isClosed(task.status) || task.allDay) return false;
      const dueAt = toDate(task.dueAt);
      const startAt = toDate(task.startAt);

      return (
        (dueAt !== null && isInVietnamDay(dueAt, date)) ||
        (startAt !== null && isInVietnamDay(startAt, date))
      );
    }),
    allDay: included.filter(
      (task) => !isFocusTask(task) && task.allDay && !isClosed(task.status),
    ),
    completed: included.filter((task) => task.status === "DONE"),
  };
}
