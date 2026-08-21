import { APP_TIME_ZONE, TASK_STATUS_LABELS } from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatVietnamDateTime(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function vietnamDayStartUtc(date: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), -7));
}

export function nextVietnamDayStartUtc(date: Date): Date {
  return new Date(vietnamDayStartUtc(date).getTime() + DAY_MS);
}

export function isInVietnamDay(date: Date, day: Date): boolean {
  const dayStart = vietnamDayStartUtc(day);
  const nextDayStart = new Date(dayStart.getTime() + DAY_MS);

  return date >= dayStart && date < nextDayStart;
}

export function isOverdue({
  dueAt,
  status,
  now,
}: {
  dueAt: Date | null;
  status: keyof typeof TASK_STATUS_LABELS;
  now: Date;
}): boolean {
  return (
    dueAt !== null &&
    dueAt.getTime() < now.getTime() &&
    status !== "DONE" &&
    status !== "CANCELLED"
  );
}
