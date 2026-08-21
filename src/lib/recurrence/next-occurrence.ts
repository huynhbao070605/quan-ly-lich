import type { RecurrenceRule } from "./types";

export function nextOccurrence(
  rule: RecurrenceRule,
  current: Date,
  _timezone: string,
): Date | null {
  switch (rule.frequency) {
    case "DAILY":
      return addDays(
        current,
        rule.interval,
      );

    case "WEEKLY":
      return nextWeekly(
        rule,
        current,
      );

    case "MONTHLY":
      return nextMonthly(
        rule,
        current,
      );

    case "YEARLY":
      return nextYearly(
        rule,
        current,
      );

    default:
      return null;
  }
}


function addDays(
  date: Date,
  days: number,
): Date {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days,
  );

  return result;
}


function nextWeekly(
  rule: RecurrenceRule,
  current: Date,
): Date | null {
  if (!rule.weekdays || rule.weekdays.length === 0) {
    return addDays(current, 7 * rule.interval);
  }

  const result = new Date(current);

  for (let i = 1; i <= 7 * rule.interval; i++) {
    result.setUTCDate(
      result.getUTCDate() + 1,
    );

    if (
      rule.weekdays.includes(
        result.getUTCDay(),
      )
    ) {
      return result;
    }
  }

  return null;
}



function nextYearly(
  rule: RecurrenceRule,
  current: Date,
): Date | null {
  const result = new Date(current);

  result.setUTCFullYear(
    result.getUTCFullYear() + rule.interval,
  );

  const targetDay =
    rule.monthDay ?? current.getUTCDate();

  const month =
    current.getUTCMonth();

  result.setUTCMonth(month);

  const lastDay =
    new Date(
      result.getUTCFullYear(),
      month + 1,
      0,
    ).getDate();

  result.setUTCDate(
    Math.min(targetDay, lastDay),
  );

  return result;
}

function nextMonthly(
  rule: RecurrenceRule,
  current: Date,
): Date | null {
  const targetDay =
    rule.monthDay ?? current.getUTCDate();

  const result = new Date(current);

  const nextMonth =
  current.getUTCMonth() + rule.interval;

    const targetYear =
    current.getUTCFullYear() +
    Math.floor(nextMonth / 12);

    const targetMonth =
    nextMonth % 12;

    const lastDay =
    new Date(
        Date.UTC(
        targetYear,
        targetMonth + 1,
        0,
        ),
    ).getUTCDate();

    const safeDay =
    Math.min(targetDay, lastDay);

    return new Date(
    Date.UTC(
        targetYear,
        targetMonth,
        safeDay,
        current.getUTCHours(),
        current.getUTCMinutes(),
        current.getUTCSeconds(),
        current.getUTCMilliseconds(),
    ),
    );
}