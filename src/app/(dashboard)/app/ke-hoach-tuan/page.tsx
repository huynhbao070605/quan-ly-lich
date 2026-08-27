import { AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";

import { ProjectProgress } from "@/components/dashboard/project-progress";
import { WeeklyAgenda } from "@/components/weekly/weekly-agenda";
import { WeeklyBoard, type WeeklyDisplayTask } from "@/components/weekly/weekly-board";
import { requireUser } from "@/lib/auth/require-user";
import { getDashboardSummary } from "@/lib/dashboard/queries";
import { isOverdue } from "@/lib/domain/time";
import { formatWeekRange, groupTasksByVietnamDay, getWeekRange } from "@/lib/tasks/weekly-plan";
import { getTaskList } from "@/lib/tasks/task-queries";
import { createServerClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

type RawWeeklyTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_at: string | null;
  due_at: string | null;
  all_day: boolean;
  completed_at: string | null;
  projects: { id: string; name: string } | null;
};

function mapTask(task: RawWeeklyTask): WeeklyDisplayTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    startAt: task.start_at,
    dueAt: task.due_at,
    allDay: task.all_day,
    completedAt: task.completed_at,
    project: task.projects,
  };
}

export default async function WeeklyPlanPage() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const now = new Date();
  const week = getWeekRange(now);
  const [rows, dashboard] = await Promise.all([
    getTaskList(supabase as never, user.id) as Promise<RawWeeklyTask[]>,
    getDashboardSummary(supabase as never, user.id, now),
  ]);
  const groups = groupTasksByVietnamDay(rows.map(mapTask), week);
  const weeklyTasks = Object.values(groups).flatMap((group) => group.tasks);
  const completedCount = weeklyTasks.filter((task) => task.status === "DONE").length;
  const overdueCount = weeklyTasks.filter((task) =>
    isOverdue({
      dueAt: task.dueAt ? new Date(task.dueAt) : null,
      status: task.status,
      now,
    }),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Kế hoạch tuần</h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatWeekRange(week.start, week.end)}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-600">Tổng công việc</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{weeklyTasks.length}</p>
            </div>
            <ListTodo aria-hidden="true" className="size-5 text-teal-700" />
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-600">Hoàn thành</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{completedCount}</p>
            </div>
            <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-700" />
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-600">Quá hạn</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{overdueCount}</p>
            </div>
            <AlertTriangle aria-hidden="true" className="size-5 text-rose-700" />
          </div>
        </article>
      </section>

      <WeeklyAgenda groups={groups} week={week} />
      <WeeklyBoard groups={groups} week={week} />
      <ProjectProgress projects={dashboard.projectProgress} />
    </div>
  );
}
