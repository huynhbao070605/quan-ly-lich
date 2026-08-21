import { CalendarDays, FolderKanban } from "lucide-react";

import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/domain/constants";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

export type TaskListItem = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
  project?: { id: string; name: string } | null;
  tags?: Array<{ id: string; name: string }>;
};

type TaskListProps = {
  tasks: TaskListItem[];
};

const tabs = ["Tất cả", "Hôm nay", "Sắp tới", "Quá hạn"];

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

function EmptyTasks() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-950">Chưa có công việc</h2>
      <p className="mt-2 text-sm text-slate-600">
        Tạo công việc đầu tiên để bắt đầu.
      </p>
    </div>
  );
}

export function TaskList({ tasks }: TaskListProps) {
  return (
    <section className="space-y-4">
      <div aria-label="Bộ lọc nhanh" className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((tab, index) => (
          <button
            aria-selected={index === 0}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 aria-selected:border-teal-600 aria-selected:bg-teal-50 aria-selected:text-teal-700"
            key={tab}
            role="tab"
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <EmptyTasks />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <article
              aria-label={task.title}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              key={task.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <h2 className="text-base font-semibold text-slate-950">
                    {task.title}
                  </h2>
                  {task.description ? (
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {task.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays aria-hidden="true" className="size-4" />
                      {formatDate(task.dueAt)}
                    </span>
                    {task.project ? (
                      <span className="inline-flex items-center gap-1">
                        <FolderKanban aria-hidden="true" className="size-4" />
                        {task.project.name}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                  <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">
                    {TASK_PRIORITY_LABELS[task.priority]}
                  </span>
                </div>
              </div>

              {task.tags && task.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {task.tags.slice(0, 2).map((tag) => (
                    <span
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
                      key={tag.id}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
