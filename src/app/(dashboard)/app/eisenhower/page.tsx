import { EisenhowerBoard, type EisenhowerTask } from "@/components/eisenhower/eisenhower-board";
import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import { getTaskList } from "@/lib/tasks/task-queries";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

type RawEisenhowerTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  important: boolean;
  urgent: boolean;
  eisenhower_override: boolean;
  projects: { id: string; name: string } | null;
};

function mapTask(task: RawEisenhowerTask): EisenhowerTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.due_at,
    important: task.important,
    urgent: task.urgent,
    eisenhowerOverride: task.eisenhower_override,
    project: task.projects,
  };
}

export default async function EisenhowerPage() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const rows = await getTaskList(
    supabase as never,
    user.id,
  ) as RawEisenhowerTask[];
  const tasks = rows.map(mapTask);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Ma trận Eisenhower</h1>
        <p className="mt-1 text-sm text-slate-600">
          Phân loại công việc theo mức độ quan trọng và khẩn cấp.
        </p>
      </div>

      <EisenhowerBoard tasks={tasks} />
    </div>
  );
}
