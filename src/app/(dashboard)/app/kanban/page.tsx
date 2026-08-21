import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { KanbanTask } from "@/components/kanban/task-card";
import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import { listTasks } from "@/lib/tasks/task-queries";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

type RawKanbanTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  kanban_position: number;
  projects: { id: string; name: string } | null;
};

function mapTask(task: RawKanbanTask): KanbanTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.due_at,
    project: task.projects,
    position: task.kanban_position,
  };
}

export default async function KanbanPage() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { data } = (await (listTasks(
    supabase as never,
    user.id,
  ) as unknown as Promise<{ data: RawKanbanTask[] | null }>)) ?? { data: [] };
  const tasks = (data ?? []).map(mapTask);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Kanban</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kéo công việc giữa các cột để cập nhật trạng thái và thứ tự.
        </p>
      </div>

      <KanbanBoard tasks={tasks} />
    </div>
  );
}
