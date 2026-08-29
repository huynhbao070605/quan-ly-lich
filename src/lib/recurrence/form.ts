import type { RecurrenceFrequency } from "./types";

export type RecurrenceFormFrequency = "NONE" | RecurrenceFrequency;

export type RecurrenceRuleInput = {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays?: number[];
  monthDay?: number | null;
  endsAt?: string | null;
};

export type RecurrenceFormState = {
  frequency: RecurrenceFormFrequency;
  interval: number;
  weekdays: number[];
};

export const defaultRecurrenceForm: RecurrenceFormState = {
  frequency: "NONE",
  interval: 1,
  weekdays: [],
};

export const recurrenceFrequencyOptions: Array<{
  label: string;
  value: RecurrenceFormFrequency;
}> = [
  { label: "Không lặp", value: "NONE" },
  { label: "Hằng ngày", value: "DAILY" },
  { label: "Hằng tuần", value: "WEEKLY" },
  { label: "Hằng tháng", value: "MONTHLY" },
  { label: "Hằng năm", value: "YEARLY" },
];

export const vietnamWeekdayOptions = [
  { label: "CN", value: 0 },
  { label: "T2", value: 1 },
  { label: "T3", value: 2 },
  { label: "T4", value: 3 },
  { label: "T5", value: 4 },
  { label: "T6", value: 5 },
  { label: "T7", value: 6 },
];

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export function recurrenceFormFromRule(
  rule?: RecurrenceRuleInput | null,
): RecurrenceFormState {
  if (!rule) {
    return defaultRecurrenceForm;
  }

  return {
    frequency: rule.frequency,
    interval: rule.interval,
    weekdays: rule.weekdays ?? [],
  };
}

export function buildRecurrenceRule(
  form: RecurrenceFormState,
  anchorIso?: string | null,
): RecurrenceRuleInput | null {
  if (form.frequency === "NONE") {
    return null;
  }

  const interval = Math.max(1, Math.trunc(form.interval || 1));
  const rule: RecurrenceRuleInput = {
    frequency: form.frequency,
    interval,
  };

  if (form.frequency === "WEEKLY") {
    rule.weekdays = form.weekdays.length > 0
      ? [...form.weekdays].sort((a, b) => a - b)
      : anchorIso
        ? [vietnamWeekday(anchorIso)]
        : [];
  }

  if ((form.frequency === "MONTHLY" || form.frequency === "YEARLY") && anchorIso) {
    rule.monthDay = vietnamMonthDay(anchorIso);
  }

  return rule;
}

export function summarizeRecurrence(rule?: RecurrenceRuleInput | null): string {
  if (!rule) {
    return "Không lặp";
  }

  const intervalPrefix = rule.interval > 1 ? `${rule.interval} ` : "";

  if (rule.frequency === "DAILY") {
    return rule.interval > 1 ? `Mỗi ${intervalPrefix}ngày` : "Hằng ngày";
  }

  if (rule.frequency === "WEEKLY") {
    const weekdays = (rule.weekdays ?? [])
      .map((day) => vietnamWeekdayOptions.find((item) => item.value === day)?.label)
      .filter(Boolean)
      .join(", ");
    const base = rule.interval > 1 ? `Mỗi ${intervalPrefix}tuần` : "Hằng tuần";
    return weekdays ? `${base}: ${weekdays}` : base;
  }

  if (rule.frequency === "MONTHLY") {
    return rule.interval > 1 ? `Mỗi ${intervalPrefix}tháng` : "Hằng tháng";
  }

  return rule.interval > 1 ? `Mỗi ${intervalPrefix}năm` : "Hằng năm";
}

function vietnamDate(iso: string): Date {
  return new Date(new Date(iso).getTime() + VIETNAM_OFFSET_MS);
}

function vietnamMonthDay(iso: string): number {
  return vietnamDate(iso).getUTCDate();
}

function vietnamWeekday(iso: string): number {
  return vietnamDate(iso).getUTCDay();
}
