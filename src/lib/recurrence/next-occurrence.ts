import type { RecurrenceRule } from "./types";

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export function nextOccurrence(
  rule: RecurrenceRule,
  current: Date,
  timezone: string,
): Date | null {
  switch (rule.frequency) {
    case "DAILY":
      return addDays(current, rule.interval, timezone);
    case "WEEKLY":
      return nextWeekly(rule, current, timezone);
    case "MONTHLY":
      return nextMonthly(rule, current, timezone);
    case "YEARLY":
      return nextYearly(rule, current, timezone);
    default:
      return null;
  }
}

function timezoneOffsetMs(timezone: string): number {
  return timezone === "Asia/Ho_Chi_Minh" ? VIETNAM_OFFSET_MS : 0;
}

function toZonedDate(date: Date, timezone: string): Date {
  return new Date(date.getTime() + timezoneOffsetMs(timezone));
}

function fromZonedDate(date: Date, timezone: string): Date {
  return new Date(date.getTime() - timezoneOffsetMs(timezone));
}

function addDays(date: Date, days: number, timezone: string): Date {
  const result = toZonedDate(date, timezone);
  result.setUTCDate(result.getUTCDate() + days);
  return fromZonedDate(result, timezone);
}

function nextWeekly(
  rule: RecurrenceRule,
  current: Date,
  timezone: string,
): Date | null {
  if (!rule.weekdays || rule.weekdays.length === 0) {
    return addDays(current, 7 * rule.interval, timezone);
  }

  const result = new Date(current);

  for (let i = 1; i <= 7 * rule.interval; i++) {
    result.setTime(addDays(result, 1, timezone).getTime());

    if (rule.weekdays.includes(toZonedDate(result, timezone).getUTCDay())) {
      return result;
    }
  }

  return null;
}

function nextMonthly(
  rule: RecurrenceRule,
  current: Date,
  timezone: string,
): Date | null {
  const local = toZonedDate(current, timezone);
  const targetDay = rule.monthDay ?? local.getUTCDate();
  const nextMonth = local.getUTCMonth() + rule.interval;
  const targetYear = local.getUTCFullYear() + Math.floor(nextMonth / 12);
  const targetMonth = nextMonth % 12;
  const safeDay = Math.min(targetDay, lastDayOfUtcMonth(targetYear, targetMonth));

  return fromZonedDate(
    new Date(Date.UTC(
      targetYear,
      targetMonth,
      safeDay,
      local.getUTCHours(),
      local.getUTCMinutes(),
      local.getUTCSeconds(),
      local.getUTCMilliseconds(),
    )),
    timezone,
  );
}

function nextYearly(
  rule: RecurrenceRule,
  current: Date,
  timezone: string,
): Date | null {
  const local = toZonedDate(current, timezone);
  const targetYear = local.getUTCFullYear() + rule.interval;
  const targetMonth = local.getUTCMonth();
  const targetDay = rule.monthDay ?? local.getUTCDate();
  const safeDay = Math.min(targetDay, lastDayOfUtcMonth(targetYear, targetMonth));

  return fromZonedDate(
    new Date(Date.UTC(
      targetYear,
      targetMonth,
      safeDay,
      local.getUTCHours(),
      local.getUTCMinutes(),
      local.getUTCSeconds(),
      local.getUTCMilliseconds(),
    )),
    timezone,
  );
}

function lastDayOfUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
