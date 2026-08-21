"use client";

import { useMemo, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { overrideEisenhower, resetEisenhower } from "@/actions/eisenhower-actions";
import { TASK_PRIORITY_LABELS } from "@/lib/domain/constants";
import { formatVietnamDateTime } from "@/lib/domain/time";
import { quadrantFromFlags, type EisenhowerQuadrant } from "@/lib/tasks/eisenhower";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

export type EisenhowerTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  important: boolean;
  urgent: boolean;
  eisenhowerOverride: boolean;
  project?: { id: string; name: string } | null;
};

type EisenhowerBoardProps = {
  tasks: EisenhowerTask[];
};

type QuadrantDefinition = {
  id: EisenhowerQuadrant;
  label: string;
  hint: string;
};

const quadrants: QuadrantDefinition[] = [
  { id: "DO_NOW", label: "Làm ngay", hint: "Quan trọng và khẩn cấp" },
  { id: "SCHEDULE", label: "Lên lịch", hint: "Quan trọng, chưa khẩn cấp" },
  { id: "DELEGATE", label: "Ủy quyền", hint: "Khẩn cấp, ít quan trọng hơn" },
  { id: "ELIMINATE", label: "Loại bỏ", hint: "Ít quan trọng và chưa khẩn cấp" },
];

function groupTasks(tasks: EisenhowerTask[]) {
  return quadrants.reduce((groups, quadrant) => {
    groups[quadrant.id] = tasks.filter(
      (task) =>
        task.status !== "DONE" &&
        task.status !== "CANCELLED" &&
        quadrantFromFlags({ important: task.important, urgent: task.urgent }) ===
          quadrant.id,
    );
    return groups;
  }, {} as Record<EisenhowerQuadrant, EisenhowerTask[]>);
}

function TaskCard({ task }: { task: EisenhowerTask }) {
  const [isPending, startTransition] = useTransition();

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">{task.title}</h3>
          {task.dueAt ? (
            <p className="mt-1 text-xs text-slate-600">
              {formatVietnamDateTime(new Date(task.dueAt))}
            </p>
          ) : null}
        </div>
        <span
          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
          title={task.eisenhowerOverride ? "Đã chỉnh thủ công" : "Tự động"}
        >
          {task.eisenhowerOverride ? "Thủ công" : "Tự động"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        {task.project ? (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            {task.project.name}
          </span>
        ) : null}
        {task.eisenhowerOverride ? (
          <button
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                void resetEisenhower(task.id);
              });
            }}
            title="Đặt lại theo gợi ý"
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-3" />
            Đặt lại
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quadrants.map((quadrant) => (
          <button
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={isPending}
            key={quadrant.id}
            onClick={() => {
              startTransition(() => {
                void overrideEisenhower(task.id, quadrant.id);
              });
            }}
            type="button"
          >
            {quadrant.label}
          </button>
        ))}
      </div>
    </article>
  );
}

function QuadrantColumn({
  quadrant,
  tasks,
}: {
  quadrant: QuadrantDefinition;
  tasks: EisenhowerTask[];
}) {
  return (
    <section className="min-h-72 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{quadrant.label}</h2>
          <p className="mt-1 text-xs text-slate-500">{quadrant.hint}</p>
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600">
          {tasks.length}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            Chưa có công việc.
          </p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>

    </section>
  );
}

export function EisenhowerBoard({ tasks }: EisenhowerBoardProps) {
  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  const [activeQuadrant, setActiveQuadrant] = useState<EisenhowerQuadrant>("DO_NOW");

  return (
    <section className="space-y-4">
      <div
        aria-label="Chọn ô Eisenhower"
        className="flex gap-2 overflow-x-auto lg:hidden"
        role="tablist"
      >
        {quadrants.map((quadrant) => (
          <button
            aria-selected={activeQuadrant === quadrant.id}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 aria-selected:border-teal-600 aria-selected:bg-teal-50 aria-selected:text-teal-700"
            key={quadrant.id}
            onClick={() => setActiveQuadrant(quadrant.id)}
            role="tab"
            type="button"
          >
            {quadrant.label}
          </button>
        ))}
      </div>

      <div className="lg:hidden">
        {quadrants
          .filter((quadrant) => quadrant.id === activeQuadrant)
          .map((quadrant) => (
            <QuadrantColumn
              key={quadrant.id}
              quadrant={quadrant}
              tasks={groups[quadrant.id]}
            />
          ))}
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        {quadrants.map((quadrant) => (
          <QuadrantColumn
            key={quadrant.id}
            quadrant={quadrant}
            tasks={groups[quadrant.id]}
          />
        ))}
      </div>
    </section>
  );
}
