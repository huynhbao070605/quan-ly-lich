import { Plus } from "lucide-react";

import { TaskFilters } from "@/components/tasks/task-filters";
import type { TaskListItem } from "@/components/tasks/task-list";
import { TaskViews } from "@/components/tasks/task-views";
import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import { listTasks } from "@/lib/tasks/task-queries";

type RawTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskListItem["status"];
  priority: TaskListItem["priority"];
  due_at: string | null;
  projects: { id: string; name: string } | null;
  task_tags?: Array<{ tags: { id: string; name: string } | null }>;
};

function mapTask(task: RawTask): TaskListItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueAt: task.due_at,
    project: task.projects,
    tags:
      task.task_tags
        ?.map((item) => item.tags)
        .filter((tag): tag is { id: string; name: string } => tag !== null) ?? [],
  };
}

export default async function TasksPage() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { data } = (await (listTasks(
    supabase as never,
    user.id,
  ) as unknown as Promise<{ data: RawTask[] | null }>)) ?? { data: [] };
  const tasks = (data ?? []).map(mapTask);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Công việc</h1>
          <p className="mt-1 text-sm text-slate-600">
            Xem và lọc toàn bộ công việc từ cùng một nguồn dữ liệu.
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
          <Plus aria-hidden="true" className="size-4" />
          Công việc mới
        </button>
      </div>

      <TaskFilters />
      <TaskViews tasks={tasks} />
    </div>
  );
}
