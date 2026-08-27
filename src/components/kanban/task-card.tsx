"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical } from "lucide-react";

import { getPriorityPresentation } from "@/lib/domain/task-display";
import { formatVietnamDateTime } from "@/lib/domain/time";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

export type KanbanTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  project?: { id: string; name: string } | null;
  position: number;
};

type TaskCardProps = {
  task: KanbanTask;
};

export function TaskCard({ task }: TaskCardProps) {
  const priority = getPriorityPresentation(task.priority);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { status: task.status },
    });

  return (
    <article
      aria-label={task.title}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${
        isDragging ? "opacity-60 ring-2 ring-teal-500" : ""
      }`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold text-slate-950">{task.title}</h3>
        <button
          aria-label={`Kéo ${task.title}`}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className={`rounded-md border px-2 py-1 font-medium ${priority.badgeClassName}`}>
          {priority.label}
        </span>
        {task.project ? (
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
            {task.project.name}
          </span>
        ) : null}
      </div>

      {task.dueAt ? (
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-600">
          <CalendarDays aria-hidden="true" className="size-4" />
          {formatVietnamDateTime(new Date(task.dueAt))}
        </p>
      ) : null}
    </article>
  );
}
