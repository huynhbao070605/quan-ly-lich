import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "./constants";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

type StatusTone = "active" | "muted" | "neutral" | "success";

type StatusPresentation = {
  badgeClassName: string;
  calendarClassName: string;
  label: string;
  tone: StatusTone;
};

type PriorityPresentation = {
  badgeClassName: string;
  chartColor: string;
  label: string;
};

const statusPresentations: Record<TaskStatus, StatusPresentation> = {
  TODO: {
    badgeClassName: "bg-slate-100 text-slate-700 border-slate-200",
    calendarClassName: "calendar-event--todo",
    label: TASK_STATUS_LABELS.TODO,
    tone: "neutral",
  },
  IN_PROGRESS: {
    badgeClassName: "bg-sky-50 text-sky-700 border-sky-200",
    calendarClassName: "calendar-event--in-progress",
    label: TASK_STATUS_LABELS.IN_PROGRESS,
    tone: "active",
  },
  DONE: {
    badgeClassName: "bg-emerald-50 text-emerald-700 border-emerald-200",
    calendarClassName: "calendar-event--done",
    label: TASK_STATUS_LABELS.DONE,
    tone: "success",
  },
  CANCELLED: {
    badgeClassName: "bg-zinc-100 text-zinc-500 border-zinc-200",
    calendarClassName: "calendar-event--cancelled",
    label: TASK_STATUS_LABELS.CANCELLED,
    tone: "muted",
  },
};

const priorityPresentations: Record<TaskPriority, PriorityPresentation> = {
  LOW: {
    badgeClassName: "bg-emerald-50 text-emerald-700 border-emerald-200",
    chartColor: "#059669",
    label: TASK_PRIORITY_LABELS.LOW,
  },
  MEDIUM: {
    badgeClassName: "bg-amber-50 text-amber-700 border-amber-200",
    chartColor: "#d97706",
    label: TASK_PRIORITY_LABELS.MEDIUM,
  },
  HIGH: {
    badgeClassName: "bg-sky-50 text-sky-700 border-sky-200",
    chartColor: "#0284c7",
    label: TASK_PRIORITY_LABELS.HIGH,
  },
  URGENT: {
    badgeClassName: "bg-rose-50 text-rose-700 border-rose-200",
    chartColor: "#e11d48",
    label: TASK_PRIORITY_LABELS.URGENT,
  },
};

export function getStatusPresentation(status: TaskStatus): StatusPresentation {
  return statusPresentations[status];
}

export function getPriorityPresentation(priority: TaskPriority): PriorityPresentation {
  return priorityPresentations[priority];
}
