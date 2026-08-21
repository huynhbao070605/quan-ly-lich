"use client";

import { useState } from "react";

import { TaskList, type TaskListItem } from "./task-list";
import { TaskTable } from "./task-table";

type TaskViewsProps = {
  tasks: TaskListItem[];
  now?: Date;
  onSelectTask?: (taskId: string) => void;
};

export function TaskViews({ tasks, now, onSelectTask }: TaskViewsProps) {
  const [view, setView] = useState<"list" | "table">("list");

  return (
    <section className="space-y-4">
      <div aria-label="Chế độ hiển thị" className="flex gap-2">
        <button aria-pressed={view === "list"} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 aria-pressed:text-teal-700" onClick={() => setView("list")} type="button">
          Danh sách
        </button>
        <button aria-pressed={view === "table"} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 aria-pressed:text-teal-700" onClick={() => setView("table")} type="button">
          Bảng
        </button>
      </div>
      {view === "list" ? (
        <TaskList now={now} onSelectTask={onSelectTask} tasks={tasks} />
      ) : (
        <TaskTable onSelectTask={onSelectTask} tasks={tasks} />
      )}
    </section>
  );
}
