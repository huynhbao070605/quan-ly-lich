import { Star } from "lucide-react";

import { requireUser } from "@/lib/auth/require-user";
import { TASK_PRIORITY_LABELS } from "@/lib/domain/constants";
import { formatVietnamDateTime } from "@/lib/domain/time";
import {
  groupDailyPlanTasks,
  type DailyPlanGroups,
  type DailyPlanTask,
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

type DailyPageTask = DailyPlanTask & {
  priority: TaskPriority;
  project?: { id: string; name: string } | null;
};

function mapTask(task: RawDailyTask): DailyPageTask {
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

function TaskCard({ task }: { task: DailyPageTask }) {
  const dateText = task.dueAt ?? task.startAt ?? task.completedAt;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">{task.title}</h3>
          {dateText ? (
            <p className="mt-1 text-sm text-slate-600">
              {formatVietnamDateTime(new Date(dateText))}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
          {task.project ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {task.project.name}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TaskGroup({
  empty,
  tasks,
  title,
}: {
  empty: string;
  tasks: DailyPageTask[];
  title: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <span className="text-sm text-slate-500">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          {empty}
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </section>
  );
}

function FocusGroup({ tasks }: { tasks: DailyPlanGroups<DailyPageTask>["focus"] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
          <Star aria-hidden="true" className="size-5 text-amber-500" />
          Trọng tâm hôm nay
        </h2>
        <span className="text-sm text-slate-500">{tasks.length}/3</span>
      </div>
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          Chưa có công việc trọng tâm.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {tasks.map((task, index) => (
            <div className="space-y-2" key={task.id}>
              <span className="text-sm font-semibold text-amber-600">#{index + 1}</span>
              <TaskCard task={task} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function DailyPlanPage() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { data } = (await (listTasks(
    supabase as never,
    user.id,
  ) as unknown as Promise<{ data: RawDailyTask[] | null }>)) ?? { data: [] };
  const tasks = (data ?? []).map(mapTask);
  const groups = groupDailyPlanTasks(tasks, new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Kế hoạch hôm nay</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tập trung vào những việc cần xử lý trong ngày.
        </p>
      </div>

      <FocusGroup tasks={groups.focus} />

      <div className="grid gap-6 xl:grid-cols-2">
        <TaskGroup
          empty="Không có công việc quá hạn."
          tasks={groups.overdue}
          title="Quá hạn"
        />
        <TaskGroup
          empty="Không có công việc đến hạn hôm nay."
          tasks={groups.today}
          title="Hôm nay"
        />
        <TaskGroup
          empty="Không có công việc cả ngày."
          tasks={groups.allDay}
          title="Cả ngày"
        />
        <TaskGroup
          empty="Chưa có công việc hoàn thành hôm nay."
          tasks={groups.completed}
          title="Hoàn thành"
        />
      </div>
    </div>
  );
}
