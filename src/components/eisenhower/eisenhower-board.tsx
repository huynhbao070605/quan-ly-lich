"use client";

import { useMemo, useState, useTransition } from "react";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RefreshCw } from "lucide-react";

import { overrideEisenhower, resetEisenhower } from "@/actions/eisenhower-actions";
import { TASK_PRIORITY_LABELS } from "@/lib/domain/constants";
import { formatVietnamDateTime } from "@/lib/domain/time";
import {
  quadrantFromFlags,
  type EisenhowerFlags,
  type EisenhowerQuadrant,
} from "@/lib/tasks/eisenhower";
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
  flags: EisenhowerFlags;
};

type QuadrantGroups = Record<EisenhowerQuadrant, EisenhowerTask[]>;

const quadrants: QuadrantDefinition[] = [
  {
    id: "DO_NOW",
    label: "Làm ngay",
    hint: "Quan trọng và khẩn cấp",
    flags: { important: true, urgent: true },
  },
  {
    id: "SCHEDULE",
    label: "Lên lịch",
    hint: "Quan trọng, chưa khẩn cấp",
    flags: { important: true, urgent: false },
  },
  {
    id: "DELEGATE",
    label: "Ủy quyền",
    hint: "Quadrant Delegate tiêu chuẩn",
    flags: { important: false, urgent: true },
  },
  {
    id: "ELIMINATE",
    label: "Loại bỏ",
    hint: "Ít quan trọng và chưa khẩn cấp",
    flags: { important: false, urgent: false },
  },
];

function createGroups(tasks: EisenhowerTask[]): QuadrantGroups {
  return quadrants.reduce((groups, quadrant) => {
    groups[quadrant.id] = tasks.filter(
      (task) =>
        task.status !== "DONE" &&
        task.status !== "CANCELLED" &&
        quadrantFromFlags({ important: task.important, urgent: task.urgent }) ===
          quadrant.id,
    );
    return groups;
  }, {} as QuadrantGroups);
}

function findTaskQuadrant(groups: QuadrantGroups, taskId: string): EisenhowerQuadrant | null {
  return quadrants.find((quadrant) => groups[quadrant.id].some((task) => task.id === taskId))?.id ?? null;
}

function findQuadrantDefinition(id: EisenhowerQuadrant): QuadrantDefinition {
  return quadrants.find((quadrant) => quadrant.id === id) ?? quadrants[0];
}

function TaskCard({ task }: { task: EisenhowerTask }) {
  const [isPending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { type: "task" },
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">{task.title}</h3>
          {task.dueAt ? (
            <p className="mt-1 text-xs text-slate-600">
              {formatVietnamDateTime(new Date(task.dueAt))}
            </p>
          ) : null}
        </div>
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        {task.project ? (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            {task.project.name}
          </span>
        ) : null}
        <span
          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
          title={task.eisenhowerOverride ? "Đã chỉnh thủ công" : "Tự động"}
        >
          {task.eisenhowerOverride ? "Thủ công" : "Tự động"}
        </span>
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
  const { setNodeRef, isOver } = useDroppable({
    id: quadrant.id,
    data: { type: "quadrant", quadrant: quadrant.id },
  });

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

      <div
        className={`mt-3 min-h-48 space-y-3 rounded-md transition ${
          isOver ? "bg-teal-50" : ""
        }`}
        ref={setNodeRef}
      >
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
  const sourceKey = useMemo(
    () =>
      tasks
        .map((task) =>
          [
            task.id,
            task.status,
            task.important,
            task.urgent,
            task.eisenhowerOverride,
          ].join(":"),
        )
        .join("|"),
    [tasks],
  );
  const sourceGroups = useMemo(() => createGroups(tasks), [tasks]);
  const [optimisticGroups, setOptimisticGroups] = useState<{
    groups: QuadrantGroups;
    sourceKey: string;
  } | null>(null);
  const groups =
    optimisticGroups?.sourceKey === sourceKey ? optimisticGroups.groups : sourceGroups;
  const [activeQuadrant, setActiveQuadrant] = useState<EisenhowerQuadrant>("DO_NOW");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const sourceQuadrant = findTaskQuadrant(groups, active.id.toString());
    const targetQuadrant =
      (over.data.current?.quadrant as EisenhowerQuadrant | undefined) ??
      findTaskQuadrant(groups, over.id.toString()) ??
      (quadrants.some((quadrant) => quadrant.id === over.id) ? (over.id as EisenhowerQuadrant) : null);

    if (!sourceQuadrant || !targetQuadrant || sourceQuadrant === targetQuadrant) {
      return;
    }

    const task = groups[sourceQuadrant].find((item) => item.id === active.id);

    if (!task) {
      return;
    }

    const targetDefinition = findQuadrantDefinition(targetQuadrant);
    const previousGroups = groups;
    const movedTask = {
      ...task,
      ...targetDefinition.flags,
      eisenhowerOverride: true,
    };
    const nextGroups = {
      ...groups,
      [sourceQuadrant]: groups[sourceQuadrant].filter((item) => item.id !== task.id),
      [targetQuadrant]: [...groups[targetQuadrant], movedTask],
    };

    setOptimisticGroups({ groups: nextGroups, sourceKey });
    setError(null);
    startTransition(() => {
      void overrideEisenhower(task.id, targetQuadrant).then((result) => {
        if (!result.ok) {
          setOptimisticGroups({ groups: previousGroups, sourceKey });
          setError("Không thể cập nhật Eisenhower. Vui lòng thử lại.");
        }
      });
    });
  }

  return (
    <section className="space-y-4">
      {error ? (
        <div
          className="fixed bottom-20 right-4 z-30 max-w-sm rounded-lg border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-700 shadow-lg"
          role="status"
        >
          {error}
        </div>
      ) : null}

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

      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <div aria-busy={isPending} className="lg:hidden">
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

        <div aria-busy={isPending} className="hidden gap-4 lg:grid lg:grid-cols-2">
          {quadrants.map((quadrant) => (
            <QuadrantColumn
              key={quadrant.id}
              quadrant={quadrant}
              tasks={groups[quadrant.id]}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}
