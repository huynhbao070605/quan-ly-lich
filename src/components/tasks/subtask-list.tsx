import { Plus } from "lucide-react";

import type { SubtaskRecord } from "@/lib/tasks/subtask-repository";

type SubtaskListProps = {
  subtasks: SubtaskRecord[];
};

export function SubtaskList({ subtasks }: SubtaskListProps) {
  const completedCount = subtasks.filter((subtask) => subtask.completed).length;

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">
          Danh sách kiểm tra {completedCount}/{subtasks.length}
        </h2>
        <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Plus aria-hidden="true" className="size-4" />
          Thêm mục
        </button>
      </div>

      {subtasks.length === 0 ? (
        <p className="text-sm text-slate-600">Chưa có mục kiểm tra.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={subtask.completed}
                readOnly
                className="size-4 rounded border-slate-300 text-teal-600"
              />
              <span className="text-sm text-slate-800">{subtask.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
