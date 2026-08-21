import { AlertTriangle, CalendarDays } from "lucide-react";

import { TASK_PRIORITY_LABELS } from "@/lib/domain/constants";
import { formatVietnamDateTime } from "@/lib/domain/time";
import type { WeeklyTaskGroups, WeekRange } from "@/lib/tasks/weekly-plan";

import type { WeeklyDisplayTask } from "./weekly-board";

type WeeklyAgendaProps = {
  groups: WeeklyTaskGroups<WeeklyDisplayTask>;
  week: WeekRange;
};

function formatDay(day: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(day);
}

export function WeeklyAgenda({ groups, week }: WeeklyAgendaProps) {
  return (
    <section aria-label="Lịch trình kế hoạch tuần" className="space-y-3 md:hidden">
      {week.days.map((day) => {
        const group = groups[day.key];
        const isHeavy = group.workloadLevel === "heavy";

        return (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={day.key}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold capitalize text-slate-950">
                {formatDay(day.date)}
              </h2>
              <span
                className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
                  isHeavy ? "text-rose-700" : "text-slate-500"
                }`}
              >
                {isHeavy ? <AlertTriangle aria-hidden="true" className="size-3.5" /> : null}
                {isHeavy ? "Ngày bận" : `${group.openTaskCount} việc mở`}
              </span>
            </div>
            {group.tasks.length === 0 ? (
              <p className="pt-3 text-sm text-slate-500">Không có công việc.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {group.tasks.map((task) => {
                  const date = task.dueAt ?? task.startAt ?? task.completedAt;

                  return (
                    <article className="py-3" key={task.id}>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 text-sm font-semibold text-slate-950">
                          {task.title}
                        </h3>
                        <span className="shrink-0 rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                        {task.project ? <span>{task.project.name}</span> : null}
                        {date && !task.allDay ? (
                          <span className="flex items-center gap-1">
                            <CalendarDays aria-hidden="true" className="size-3.5" />
                            {formatVietnamDateTime(new Date(date))}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
