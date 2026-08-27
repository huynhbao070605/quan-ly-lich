import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { KanbanTask } from "@/components/kanban/task-card";
import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import { getTaskList } from "@/lib/tasks/task-queries";
import {
  parseTaskRouteParams,
  type TaskRouteSearchParams,
} from "@/lib/tasks/task-route-params";
import type { RecurrenceFrequency } from "@/lib/recurrence/types";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

type RawKanbanTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_at: string | null;
  due_at: string | null;
  all_day: boolean;
  kanban_position: number;
  recurrence_series_id: string | null;
  occurrence_start_at: string | null;
  recurrence_series: {
    frequency: RecurrenceFrequency;
    interval: number;
    weekdays: number[] | null;
    month_day: number | null;
    ends_at: string | null;
  } | null;
  projects: { id: string; name: string } | null;
};

function mapTask(task: RawKanbanTask): KanbanTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    startAt: task.start_at,
    dueAt: task.due_at,
    allDay: task.all_day,
    project: task.projects,
    position: task.kanban_position,
    recurrenceRule: task.recurrence_series
      ? {
          frequency: task.recurrence_series.frequency,
          interval: task.recurrence_series.interval,
          weekdays: task.recurrence_series.weekdays ?? undefined,
          monthDay: task.recurrence_series.month_day,
          endsAt: task.recurrence_series.ends_at,
        }
      : null,
    recurrenceSeriesId: task.recurrence_series_id,
    occurrenceStartAt: task.occurrence_start_at,
  };
}

type KanbanPageProps = {
  searchParams: Promise<TaskRouteSearchParams>;
};

export default async function KanbanPage({ searchParams }: KanbanPageProps) {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { filters } = parseTaskRouteParams(await searchParams);
  const projectFilters = filters.projectId ? { projectId: filters.projectId } : {};
  const rows = await getTaskList(
    supabase as never,
    user.id,
    projectFilters,
  ) as RawKanbanTask[];
  const tasks = rows.map(mapTask);

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
