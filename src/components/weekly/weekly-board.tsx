import { AlertTriangle, CalendarDays } from "lucide-react";

import { TASK_PRIORITY_LABELS } from "@/lib/domain/constants";
import { formatVietnamDateTime } from "@/lib/domain/time";
import type { WeeklyPlanTask, WeeklyTaskGroups, WeekRange } from "@/lib/tasks/weekly-plan";
import type { TaskPriority } from "@/lib/validation/task";

export type WeeklyDisplayTask = WeeklyPlanTask & {
  priority: TaskPriority;
  allDay: boolean;
  project?: { id: string; name: string } | null;
};

type WeeklyBoardProps = {
  groups: WeeklyTaskGroups<WeeklyDisplayTask>;
  week: WeekRange;
};

function formatDay(day: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(day);
}

function WeeklyTaskCard({ task }: { task: WeeklyDisplayTask }) {
  const date = task.dueAt ?? task.startAt ?? task.completedAt;

  return (
    <article className="space-y-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-950">{task.title}</h3>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-teal-50 px-2 py-1 font-medium text-teal-700">
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        {task.project ? (
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
            {task.project.name}
          </span>
        ) : null}
      </div>
      {date && !task.allDay ? (
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <CalendarDays aria-hidden="true" className="size-3.5" />
          {formatVietnamDateTime(new Date(date))}
        </p>
      ) : null}
    </article>
  );
}

export function WeeklyBoard({ groups, week }: WeeklyBoardProps) {
  return (
    <section aria-label="Bảng kế hoạch tuần" className="hidden gap-3 md:grid md:grid-cols-7">
      {week.days.map((day) => {
        const group = groups[day.key];
        const isHeavy = group.workloadLevel === "heavy";

        return (
          <section className="min-w-0 space-y-3" key={day.key}>
            <div className="border-b border-slate-200 pb-2">
              <h2 className="text-sm font-semibold capitalize text-slate-950">
                {formatDay(day.date)}
              </h2>
              <p
                className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                  isHeavy ? "text-rose-700" : "text-slate-500"
                }`}
              >
                {isHeavy ? <AlertTriangle aria-hidden="true" className="size-3.5" /> : null}
                {isHeavy ? "Ngày bận" : `${group.openTaskCount} việc mở`}
              </p>
            </div>
            {group.tasks.length === 0 ? (
              <p className="text-sm text-slate-400">Không có công việc</p>
            ) : (
              <div className="space-y-2">
                {group.tasks.map((task) => (
                  <WeeklyTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
