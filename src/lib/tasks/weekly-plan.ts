import { APP_TIME_ZONE } from "@/lib/domain/constants";
import { vietnamDayStartUtc } from "@/lib/domain/time";
import type { TaskStatus } from "@/lib/validation/task";

const DAY_MS = 24 * 60 * 60 * 1000;

export type WeeklyPlanTask = {
  id: string;
  title: string;
  status: TaskStatus;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
};

export type WeeklyPlanDay = {
  date: Date;
  key: string;
};

export type WeekRange = {
  start: Date;
  end: Date;
  days: WeeklyPlanDay[];
};

export type WeeklyTaskGroup<T extends WeeklyPlanTask> = WeeklyPlanDay & {
  tasks: T[];
  openTaskCount: number;
  workloadLevel: "normal" | "heavy";
};

export type WeeklyTaskGroups<T extends WeeklyPlanTask> = Record<string, WeeklyTaskGroup<T>>;

function vietnamDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function vietnamDateParts(date: Date): { day: string; month: string; year: string } {
  const [year, month, day] = vietnamDateKey(date).split("-");

  return { day, month, year };
}

function vietnamWeekday(date: Date): number {
  const [year, month, day] = vietnamDateKey(date).split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function formatWeekRange(start: Date, end: Date): string {
  const startParts = vietnamDateParts(start);
  const endParts = vietnamDateParts(end);
  const startDate = `${startParts.day}/${startParts.month}`;
  const startYear = startParts.year === endParts.year ? "" : `/${startParts.year}`;

  return `${startDate}${startYear} - ${endParts.day}/${endParts.month}/${endParts.year}`;
}

function taskDate(task: WeeklyPlanTask): Date | null {
  const value = task.dueAt ?? task.startAt ?? task.completedAt;

  return value === null ? null : new Date(value);
}

function isOpenTask(status: TaskStatus): boolean {
  return status !== "DONE" && status !== "CANCELLED";
}

export function getWeekRange(date: Date): WeekRange {
  const dateStart = vietnamDayStartUtc(date);
  const weekday = vietnamWeekday(date);
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const start = new Date(dateStart.getTime() - daysSinceMonday * DAY_MS);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start.getTime() + index * DAY_MS);

    return { date: day, key: vietnamDateKey(day) };
  });

  return {
    start,
    end: new Date(start.getTime() + 7 * DAY_MS - 1),
    days,
  };
}

export function getWorkloadLevel(openTaskCount: number): "normal" | "heavy" {
  return openTaskCount >= 7 ? "heavy" : "normal";
}

export function groupTasksByVietnamDay<T extends WeeklyPlanTask>(
  tasks: T[],
  week: WeekRange,
): WeeklyTaskGroups<T> {
  const groups = Object.fromEntries(
    week.days.map((day) => [
      day.key,
      { ...day, tasks: [], openTaskCount: 0, workloadLevel: "normal" as const },
    ]),
  ) as WeeklyTaskGroups<T>;

  for (const task of tasks) {
    const date = taskDate(task);

    if (date === null) continue;

    const group = groups[vietnamDateKey(date)];

    if (!group) continue;

    group.tasks.push(task);
    if (isOpenTask(task.status)) {
      group.openTaskCount += 1;
    }
  }

  for (const group of Object.values(groups)) {
    group.workloadLevel = getWorkloadLevel(group.openTaskCount);
  }

  return groups;
}
