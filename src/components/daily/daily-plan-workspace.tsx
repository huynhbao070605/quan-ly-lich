"use client";

import { ArrowDown, ArrowUp, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeFocus, reorderFocus, setFocus } from "@/actions/focus-actions";
import { TASK_PRIORITY_LABELS } from "@/lib/domain/constants";
import { formatVietnamDateTime } from "@/lib/domain/time";
import type { DailyPlanGroups, DailyPlanTask } from "@/lib/tasks/daily-plan";
import type { TaskPriority } from "@/lib/validation/task";

export type DailyWorkspaceTask = DailyPlanTask & {
  priority: TaskPriority;
  project?: { id: string; name: string } | null;
};

type DailyPlanWorkspaceProps = {
  date: string;
  groups: DailyPlanGroups<DailyWorkspaceTask>;
};

type TaskCardProps = {
  onAddFocus?: () => void;
  task: DailyWorkspaceTask;
};

function TaskCard({ onAddFocus, task }: TaskCardProps) {
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
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
          {task.project ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {task.project.name}
            </span>
          ) : null}
          {onAddFocus ? (
            <button
              aria-label={`Thêm ${task.title} vào trọng tâm`}
              className="inline-flex size-8 items-center justify-center rounded-md text-amber-600 hover:bg-amber-50"
              onClick={onAddFocus}
              type="button"
            >
              <Star aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TaskGroup({
  empty,
  focusCount,
  onAddFocus,
  tasks,
  title,
}: {
  empty: string;
  focusCount: number;
  onAddFocus: (task: DailyWorkspaceTask) => void;
  tasks: DailyWorkspaceTask[];
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
            <TaskCard
              key={task.id}
              onAddFocus={
                focusCount < 3 && task.status !== "DONE" && task.status !== "CANCELLED"
                  ? () => onAddFocus(task)
                  : undefined
              }
              task={task}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function DailyPlanWorkspace({ date, groups }: DailyPlanWorkspaceProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function run(
    promise: Promise<{ ok: true; data: null } | { ok: false; message: string }>,
  ) {
    const result = await promise;
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    router.refresh();
  }

  function moveFocus(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= groups.focus.length) return;

    const orderedIds = groups.focus.map((task) => task.id);
    [orderedIds[index], orderedIds[targetIndex]] = [
      orderedIds[targetIndex],
      orderedIds[index],
    ];
    void run(reorderFocus(date, orderedIds));
  }

  const addFocus = (task: DailyWorkspaceTask) =>
    void run(setFocus(task.id, date, groups.focus.length + 1));

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-rose-700" role="status">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
            <Star aria-hidden="true" className="size-5 text-amber-500" />
            Trọng tâm hôm nay
          </h2>
          <span className="text-sm text-slate-500">{groups.focus.length}/3</span>
        </div>
        {groups.focus.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            Chưa có công việc trọng tâm.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {groups.focus.map((task, index) => (
              <div className="space-y-2" key={task.id}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-600">#{index + 1}</span>
                  <div className="flex gap-1">
                    <button
                      aria-label={`Đưa ${task.title} lên`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() => moveFocus(index, -1)}
                      type="button"
                    >
                      <ArrowUp aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      aria-label={`Đưa ${task.title} xuống`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                      disabled={index === groups.focus.length - 1}
                      onClick={() => moveFocus(index, 1)}
                      type="button"
                    >
                      <ArrowDown aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      aria-label={`Xóa ${task.title} khỏi trọng tâm`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                      onClick={() => void run(removeFocus(task.id))}
                      type="button"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </div>
                <TaskCard task={task} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <TaskGroup empty="Không có công việc quá hạn." focusCount={groups.focus.length} onAddFocus={addFocus} tasks={groups.overdue} title="Quá hạn" />
        <TaskGroup empty="Không có công việc đến hạn hôm nay." focusCount={groups.focus.length} onAddFocus={addFocus} tasks={groups.today} title="Hôm nay" />
        <TaskGroup empty="Không có công việc cả ngày." focusCount={groups.focus.length} onAddFocus={addFocus} tasks={groups.allDay} title="Cả ngày" />
        <TaskGroup empty="Chưa có công việc hoàn thành hôm nay." focusCount={groups.focus.length} onAddFocus={addFocus} tasks={groups.completed} title="Hoàn thành" />
      </div>
    </div>
  );
}
