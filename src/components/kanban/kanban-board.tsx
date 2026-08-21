"use client";

import { useMemo, useState, useTransition } from "react";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { moveTaskBetweenColumns, reorderColumn } from "@/actions/kanban-actions";
import { TASK_STATUS_LABELS } from "@/lib/domain/constants";
import type { TaskStatus } from "@/lib/validation/task";

import { KanbanColumn } from "./kanban-column";
import type { KanbanTask } from "./task-card";

type KanbanBoardProps = {
  tasks: KanbanTask[];
};

type BoardColumns = Record<TaskStatus, KanbanTask[]>;

const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];

function createColumns(tasks: KanbanTask[]): BoardColumns {
  return statuses.reduce((columns, status) => {
    columns[status] = tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
    return columns;
  }, {} as BoardColumns);
}

function findTaskStatus(columns: BoardColumns, taskId: string): TaskStatus | null {
  return (
    statuses.find((status) => columns[status].some((task) => task.id === taskId)) ?? null
  );
}

function resolveOverStatus(
  columns: BoardColumns,
  overId: string,
  overStatus?: TaskStatus,
): TaskStatus | null {
  if (statuses.includes(overId as TaskStatus)) {
    return overId as TaskStatus;
  }

  return overStatus ?? findTaskStatus(columns, overId);
}

function withRecomputedPositions(tasks: KanbanTask[]): KanbanTask[] {
  return tasks.map((task, index) => ({ ...task, position: index }));
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const initialColumns = useMemo(() => createColumns(tasks), [tasks]);
  const [columns, setColumns] = useState<BoardColumns>(initialColumns);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function persistMove(
    previousColumns: BoardColumns,
    nextColumns: BoardColumns,
    task: KanbanTask,
    sourceStatus: TaskStatus,
    targetStatus: TaskStatus,
  ) {
    const targetTaskIds = nextColumns[targetStatus].map((item) => item.id);
    const result =
      sourceStatus === targetStatus
        ? await reorderColumn(targetStatus, targetTaskIds)
        : await moveTaskBetweenColumns(
            task.id,
            targetStatus,
            nextColumns[sourceStatus].map((item) => item.id),
            targetTaskIds,
          );

    if (!result.ok) {
      setColumns(previousColumns);
      setError("Không thể cập nhật công việc. Vui lòng thử lại.");
      return;
    }

    setError(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const sourceStatus = findTaskStatus(columns, active.id.toString());
    const targetStatus = resolveOverStatus(
      columns,
      over.id.toString(),
      over.data.current?.status,
    );

    if (!sourceStatus || !targetStatus) {
      return;
    }

    const task = columns[sourceStatus].find((item) => item.id === active.id);

    if (!task) {
      return;
    }

    const previousColumns = columns;
    const sourceTasks = columns[sourceStatus].filter((item) => item.id !== task.id);
    const targetTasks =
      sourceStatus === targetStatus
        ? columns[targetStatus]
        : columns[targetStatus].filter((item) => item.id !== task.id);
    const overIndex = targetTasks.findIndex((item) => item.id === over.id);
    const targetIndex = overIndex >= 0 ? overIndex : targetTasks.length;
    const movedTask = { ...task, status: targetStatus };
    const nextTargetTasks =
      sourceStatus === targetStatus
        ? arrayMove(targetTasks, columns[sourceStatus].findIndex((item) => item.id === task.id), targetIndex)
        : [
            ...targetTasks.slice(0, targetIndex),
            movedTask,
            ...targetTasks.slice(targetIndex),
          ];
    const nextColumns = {
      ...columns,
      [sourceStatus]:
        sourceStatus === targetStatus
          ? withRecomputedPositions(nextTargetTasks)
          : withRecomputedPositions(sourceTasks),
      [targetStatus]: withRecomputedPositions(nextTargetTasks),
    };

    setColumns(nextColumns);
    startTransition(() => {
      void persistMove(previousColumns, nextColumns, task, sourceStatus, targetStatus);
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

      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <div aria-busy={isPending} className="grid gap-4 overflow-x-auto xl:grid-cols-4">
          {statuses.map((status) => (
            <KanbanColumn
              key={status}
              label={TASK_STATUS_LABELS[status]}
              status={status}
              tasks={columns[status]}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}
