import { APP_TIME_ZONE, TASK_STATUS_LABELS } from "./constants";

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
