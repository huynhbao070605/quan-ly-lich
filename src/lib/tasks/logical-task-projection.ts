import { isInVietnamDay } from "@/lib/domain/time";
import type { RecurrenceRuleInput } from "@/lib/recurrence/form";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

export type LogicalTaskProjectionInput = {
  allDay?: boolean;
  completedAt?: string | null;
  dueAt: string | null;
  id: string;
  occurrenceStartAt?: string | null;
  priority: TaskPriority;
  recurrenceRule?: RecurrenceRuleInput | null;
  recurrenceSeriesId?: string | null;
  startAt?: string | null;
  status: TaskStatus;
  title: string;
};

function isOpenTask(task: LogicalTaskProjectionInput): boolean {
  return task.status === "TODO" || task.status === "IN_PROGRESS";
}

function taskDate(task: LogicalTaskProjectionInput): Date | null {
  const value =
    task.dueAt ??
    task.startAt ??
    task.occurrenceStartAt ??
    task.completedAt ??
    null;

  return value === null ? null : new Date(value);
}

function compareTasksByDateThenId(
  a: LogicalTaskProjectionInput,
  b: LogicalTaskProjectionInput,
): number {
  const aTime = taskDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTime = taskDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;

  if (aTime !== bTime) {
    return aTime - bTime;
  }

  return a.id.localeCompare(b.id);
}

function isTaskInVietnamDay(task: LogicalTaskProjectionInput, date: Date): boolean {
  const value = taskDate(task);

  return value !== null && isInVietnamDay(value, date);
}

export function selectRepresentativeOccurrence<T extends LogicalTaskProjectionInput>(
  tasks: readonly T[],
  now: Date,
): T {
  const sorted = [...tasks].sort(compareTasksByDateThenId);
  const today = sorted.find((task) => isTaskInVietnamDay(task, now));

  if (today) {
    return today;
  }

  const unresolved = sorted.filter(isOpenTask);

  if (unresolved.length > 0) {
    return unresolved.sort((a, b) => {
      const aDistance = Math.abs((taskDate(a)?.getTime() ?? now.getTime()) - now.getTime());
      const bDistance = Math.abs((taskDate(b)?.getTime() ?? now.getTime()) - now.getTime());

      if (aDistance !== bDistance) {
        return aDistance - bDistance;
      }

      return compareTasksByDateThenId(a, b);
    })[0];
  }

  return sorted[0];
}

export function getLogicalKanbanTasks<T extends LogicalTaskProjectionInput>(
  tasks: readonly T[],
  now: Date = new Date(),
): T[] {
  const nonRecurring: T[] = [];
  const recurringGroups = new Map<string, T[]>();

  for (const task of tasks) {
    if (!task.recurrenceSeriesId) {
      nonRecurring.push(task);
      continue;
    }

    const group = recurringGroups.get(task.recurrenceSeriesId) ?? [];
    group.push(task);
    recurringGroups.set(task.recurrenceSeriesId, group);
  }

  return [
    ...Array.from(recurringGroups.values(), (group) =>
      selectRepresentativeOccurrence(group, now),
    ),
    ...nonRecurring,
  ].sort(compareTasksByDateThenId);
}

export function getTodayLogicalTasks<T extends LogicalTaskProjectionInput>(
  tasks: readonly T[],
  now: Date = new Date(),
): T[] {
  const todayTasks: T[] = [];
  const recurringGroups = new Map<string, T[]>();

  for (const task of tasks) {
    if (!task.recurrenceSeriesId) {
      if (isTaskInVietnamDay(task, now)) {
        todayTasks.push(task);
      }
      continue;
    }

    const group = recurringGroups.get(task.recurrenceSeriesId) ?? [];
    group.push(task);
    recurringGroups.set(task.recurrenceSeriesId, group);
  }

  for (const group of recurringGroups.values()) {
    const today = group
      .filter((task) => isTaskInVietnamDay(task, now))
      .sort(compareTasksByDateThenId)[0];

    if (today) {
      todayTasks.push(today);
    }
  }

  return todayTasks.sort(compareTasksByDateThenId);
}
