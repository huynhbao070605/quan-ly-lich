import { APP_TIME_ZONE, TASK_STATUS_LABELS } from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_UTC_OFFSET_HOURS = 7;

function vietnamDateParts(date: Date): Record<Intl.DateTimeFormatPartTypes, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  ) as Record<Intl.DateTimeFormatPartTypes, string>;
}

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

export function formatVietnamDateInput(date: Date): string {
  const parts = vietnamDateParts(date);

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatVietnamTimeInput(date: Date): string {
  const parts = vietnamDateParts(date);

  return `${parts.hour}:${parts.minute}`;
}

export function vietnamDateTimeToUtcIso(dateValue: string, timeValue = "00:00"): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;
  const utc = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - VIETNAM_UTC_OFFSET_HOURS,
    Number(minute),
  ));

  return Number.isNaN(utc.getTime()) ? null : utc.toISOString();
}

export function vietnamDayStartUtc(date: Date): Date {
  const values = vietnamDateParts(date);

  return new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    -VIETNAM_UTC_OFFSET_HOURS,
  ));
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
