import {
  DailyPlanWorkspace,
  type DailyWorkspaceTask,
} from "@/components/daily/daily-plan-workspace";
import { requireUser } from "@/lib/auth/require-user";
import {
  groupDailyPlanTasks,
  vietnamDateKey,
} from "@/lib/tasks/daily-plan";
import { createServerClient } from "@/lib/supabase/server";
import { listTasks } from "@/lib/tasks/task-queries";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

type RawDailyTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_at: string | null;
  due_at: string | null;
  all_day: boolean;
  completed_at: string | null;
  focus_date: string | null;
  focus_position: number | null;
  projects: { id: string; name: string } | null;
};

function mapTask(task: RawDailyTask): DailyWorkspaceTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    startAt: task.start_at,
    dueAt: task.due_at,
    allDay: task.all_day,
    completedAt: task.completed_at,
    focusDate: task.focus_date,
    focusPosition: task.focus_position,
    project: task.projects,
  };
}

export default async function DailyPlanPage() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { data } = (await (listTasks(
    supabase as never,
    user.id,
  ) as unknown as Promise<{ data: RawDailyTask[] | null }>)) ?? { data: [] };
  const now = new Date();
  const groups = groupDailyPlanTasks((data ?? []).map(mapTask), now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Kế hoạch hôm nay</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tập trung vào những việc cần xử lý trong ngày.
        </p>
      </div>

      <DailyPlanWorkspace date={vietnamDateKey(now)} groups={groups} />
    </div>
  );
}
