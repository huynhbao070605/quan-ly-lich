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
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { moveTaskBetweenColumns, reorderColumn } from "@/actions/kanban-actions";
import { TASK_STATUS_LABELS } from "@/lib/domain/constants";
import { getPriorityPresentation } from "@/lib/domain/task-display";
import {
  getLogicalKanbanTasks,
  getTodayLogicalTasks,
} from "@/lib/tasks/logical-task-projection";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

import { KanbanColumn } from "./kanban-column";
import type { KanbanTask } from "./task-card";

type KanbanBoardProps = {
  tasks: KanbanTask[];
};

type BoardColumns = Record<TaskStatus, KanbanTask[]>;

const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

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

function buildSourceKey(tasks: KanbanTask[]): string {
  return tasks
    .map((task) =>
      [
        task.id,
        task.status,
        task.position,
        task.priority,
        task.dueAt,
        task.startAt,
        task.recurrenceSeriesId,
        task.occurrenceStartAt,
      ].join(":"),
    )
    .join("|");
}

export function getKanbanBoardTasks(
  tasks: KanbanTask[],
  now: Date = new Date(),
): KanbanTask[] {
  return getLogicalKanbanTasks(tasks, now);
}

export function getPriorityBreakdown(tasks: KanbanTask[]) {
  return priorities.map((priority) => {
    const presentation = getPriorityPresentation(priority);

    return {
      priority,
      label: presentation.label,
      count: tasks.filter((task) => task.priority === priority).length,
      color: presentation.chartColor,
    };
  });
}

export function getTodayPriorityBreakdown(
  tasks: KanbanTask[],
  now: Date = new Date(),
) {
  return getPriorityBreakdown(getTodayLogicalTasks(tasks, now));
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const boardTasks = useMemo(() => getKanbanBoardTasks(tasks), [tasks]);
  const sourceKey = useMemo(() => buildSourceKey(boardTasks), [boardTasks]);
  const sourceColumns = useMemo(() => createColumns(boardTasks), [boardTasks]);
  const [optimisticColumns, setOptimisticColumns] = useState<{
    columns: BoardColumns;
    sourceKey: string;
  } | null>(null);
  const columns =
    optimisticColumns?.sourceKey === sourceKey
      ? optimisticColumns.columns
      : sourceColumns;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const priorityBreakdown = getTodayPriorityBreakdown(tasks);
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
      setOptimisticColumns({ columns: previousColumns, sourceKey });
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

    setOptimisticColumns({ columns: nextColumns, sourceKey });
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

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-950">Ưu tiên hôm nay</h2>
          <span className="text-xs text-slate-500">
            Theo công việc trong ngày
          </span>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)] md:items-center">
          <div className="h-44">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={priorityBreakdown}
                  dataKey="count"
                  innerRadius={46}
                  nameKey="label"
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {priorityBreakdown.map((item) => (
                    <Cell fill={item.color} key={item.priority} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} công việc`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {priorityBreakdown.map((item) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"
                key={item.priority}
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
                <span className="font-semibold text-slate-950">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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
