import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/domain/constants";

import type { TaskListItem } from "./task-list";

type TaskTableProps = {
  tasks: TaskListItem[];
  onSelectTask?: (taskId: string) => void;
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "Không có hạn";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function TaskTable({ tasks, onSelectTask }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">Chưa có công việc</h2>
        <p className="mt-2 text-sm text-slate-600">
          Tạo công việc đầu tiên để bắt đầu.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Công việc</th>
              <th className="px-4 py-3">Dự án</th>
              <th className="px-4 py-3">Ưu tiên</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Hạn chót</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="px-4 py-3 font-medium text-slate-950">
                  {onSelectTask ? (
                    <button
                      className="text-left hover:text-teal-700"
                      onClick={() => onSelectTask(task.id)}
                      type="button"
                    >
                      {task.title}
                    </button>
                  ) : task.title}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {task.project?.name ?? "Không có dự án"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {TASK_PRIORITY_LABELS[task.priority]}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {TASK_STATUS_LABELS[task.status]}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(task.dueAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
