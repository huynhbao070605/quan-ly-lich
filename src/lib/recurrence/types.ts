export type RecurrenceFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "YEARLY";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays?: number[];
  monthDay?: number | null;
  endsAt?: Date | null;
};