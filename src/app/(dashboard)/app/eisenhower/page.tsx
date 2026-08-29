import { EisenhowerBoard, type EisenhowerTask } from "@/components/eisenhower/eisenhower-board";
import { requireUser } from "@/lib/auth/require-user";
import type { RecurrenceFrequency } from "@/lib/recurrence/types";
import { createServerClient } from "@/lib/supabase/server";
import { getTaskList } from "@/lib/tasks/task-queries";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

type RawEisenhowerTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_at: string | null;
  due_at: string | null;
  all_day: boolean;
  important: boolean;
  urgent: boolean;
  eisenhower_override: boolean;
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

function mapTask(task: RawEisenhowerTask): EisenhowerTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    startAt: task.start_at,
    dueAt: task.due_at,
    allDay: task.all_day,
    important: task.important,
    urgent: task.urgent,
    eisenhowerOverride: task.eisenhower_override,
    project: task.projects,
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
