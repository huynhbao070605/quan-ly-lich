"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import type { TaskStatus } from "@/lib/validation/task";

import { TaskCard, type KanbanTask } from "./task-card";

type KanbanColumnProps = {
  label: string;
  status: TaskStatus;
  tasks: KanbanTask[];
};

export function KanbanColumn({ label, status, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <section className="flex min-h-[24rem] min-w-72 flex-col rounded-lg border border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
        <h2 className="text-sm font-semibold text-slate-950">{label}</h2>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div
          className={`flex flex-1 flex-col gap-3 p-3 transition ${
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
      </SortableContext>
    </section>
  );
}
