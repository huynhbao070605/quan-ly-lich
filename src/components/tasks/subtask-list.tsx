"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { SubtaskRecord } from "@/lib/tasks/subtask-repository";

type SubtaskListProps = {
  subtasks: SubtaskRecord[];
  taskId: string;
  onAdd?: (taskId: string, title: string) => Promise<void> | void;
  onDelete?: (subtaskId: string) => Promise<void> | void;
  onReorder?: (taskId: string, orderedIds: string[]) => Promise<void> | void;
  onToggle?: (subtaskId: string, completed: boolean) => Promise<void> | void;
};

export function SubtaskList({
  onAdd,
  onDelete,
  onReorder,
  onToggle,
  subtasks,
  taskId,
}: SubtaskListProps) {
  const [title, setTitle] = useState("");
  const completedCount = subtasks.filter((subtask) => subtask.completed).length;

  async function addItem() {
    const trimmedTitle = title.trim();
    if (!onAdd || trimmedTitle.length === 0) return;

    await onAdd(taskId, trimmedTitle);
    setTitle("");
  }

  function moveItem(index: number, direction: -1 | 1) {
    if (!onReorder) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= subtasks.length) return;

    const orderedIds = subtasks.map((subtask) => subtask.id);
    [orderedIds[index], orderedIds[targetIndex]] = [
      orderedIds[targetIndex],
      orderedIds[index],
    ];
    void onReorder(taskId, orderedIds);
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 p-3">
      <h3 className="text-sm font-medium text-slate-700">
        Danh sách kiểm tra {completedCount}/{subtasks.length}
      </h3>

      {subtasks.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {subtasks.map((subtask, index) => (
            <li className="flex items-center gap-2 py-2" key={subtask.id}>
              <input
                aria-label={subtask.title}
                checked={subtask.completed}
                className="size-4 rounded border-slate-300 text-teal-600"
                disabled={!onToggle}
                onChange={(event) => void onToggle?.(subtask.id, event.target.checked)}
                type="checkbox"
              />
              <span className="min-w-0 flex-1 text-sm text-slate-800">
                {subtask.title}
              </span>
              <button
                aria-label={`Đưa ${subtask.title} lên`}
                className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                disabled={!onReorder || index === 0}
                onClick={() => moveItem(index, -1)}
                type="button"
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
              <button
                aria-label={`Đưa ${subtask.title} xuống`}
                className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                disabled={!onReorder || index === subtasks.length - 1}
                onClick={() => moveItem(index, 1)}
                type="button"
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>
              <button
                aria-label={`Xóa ${subtask.title}`}
                className="inline-flex size-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                disabled={!onDelete}
                onClick={() => void onDelete?.(subtask.id)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">Chưa có mục kiểm tra.</p>
      )}

      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`subtask-title-${taskId}`}>
          Thêm mục kiểm tra
        </label>
        <input
          className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
          id={`subtask-title-${taskId}`}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <button
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={!onAdd || title.trim().length === 0}
          onClick={() => void addItem()}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Thêm mục
        </button>
      </div>
    </section>
  );
}
