import { isOverdue } from "@/lib/domain/time";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

export type EisenhowerFlags = {
  important: boolean;
  urgent: boolean;
};

export type EisenhowerQuadrant =
  | "DO_NOW"
  | "SCHEDULE"
  | "DELEGATE"
  | "ELIMINATE";

type SuggestEisenhowerInput = {
  priority: TaskPriority;
  dueAt: Date | null;
  status: TaskStatus;
  now: Date;
};

const UPCOMING_DEADLINE_MS = 24 * 60 * 60 * 1000;

export function suggestEisenhower({
  priority,
  dueAt,
  status,
  now,
}: SuggestEisenhowerInput): EisenhowerFlags {
  const important = priority === "HIGH" || priority === "URGENT";
  const upcoming =
    dueAt !== null &&
    dueAt.getTime() >= now.getTime() &&
    dueAt.getTime() - now.getTime() <= UPCOMING_DEADLINE_MS &&
    status !== "DONE" &&
    status !== "CANCELLED";

  return {
    important,
    urgent: upcoming || isOverdue({ dueAt, status, now }),
  };
}

export function quadrantFromFlags(
  flags: EisenhowerFlags,
): EisenhowerQuadrant {
  if (flags.important && flags.urgent) {
    return "DO_NOW";
  }

  if (flags.important) {
    return "SCHEDULE";
  }

  if (flags.urgent) {
    return "DELEGATE";
  }

  return "ELIMINATE";
}
