import { AlertTriangle, CalendarClock } from "lucide-react";

import { ProjectProgress } from "@/components/dashboard/project-progress";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import {
  getDashboardSummary,
  type DashboardSupabaseClient,
  type DashboardTaskSummary,
} from "@/lib/dashboard/queries";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/domain/constants";
import { formatVietnamDateTime } from "@/lib/domain/time";
import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";

function TaskSummaryList({
  empty,
  tasks,
}: {
  empty: string;
  tasks: DashboardTaskSummary[];
}) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        {empty}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <article
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          key={task.id}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-950">{task.title}</h3>
              {task.dueAt ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                  <CalendarClock aria-hidden="true" className="size-4" />
                  {formatVietnamDateTime(new Date(task.dueAt))}
                </p>
              ) : null}
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
        </article>
      ))}
    </div>
  );
}

export default async function OverviewPage() {
  const user = await requireUser();
  const supabase = (await createServerClient()) as unknown as DashboardSupabaseClient;
  const summary = await getDashboardSummary(supabase, user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Tổng quan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Theo dõi việc cần làm hôm nay và tình hình công việc hiện tại.
        </p>
      </div>

      <SummaryCards summary={summary} />

      {summary.overdueCount > 0 ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle aria-hidden="true" className="size-5" />
            <h2 className="text-base font-semibold">Cần chú ý</h2>
          </div>
          <p className="mt-1 text-sm text-rose-700">
            Bạn có {summary.overdueCount} công việc quá hạn cần xử lý.
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-950">Danh sách hôm nay</h2>
          <TaskSummaryList
            empty="Không có công việc đến hạn hôm nay."
            tasks={summary.todayTasks}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-950">Sắp tới</h2>
          <TaskSummaryList
            empty="Chưa có công việc sắp tới."
            tasks={summary.upcomingTasks}
          />
        </section>
      </div>

      <ProjectProgress projects={summary.projectProgress} />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-950">Theo trạng thái</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.statusBreakdown.map((item) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              key={item.status}
            >
              <p className="text-sm font-medium text-slate-600">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.count}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
