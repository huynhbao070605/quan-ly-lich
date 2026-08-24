import { moveCalendarTask, resizeCalendarTask } from "@/actions/calendar-actions";
import { TaskCalendar, type CalendarTask } from "@/components/calendar/task-calendar";
import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import { listTasks } from "@/lib/tasks/task-queries";

type CalendarTaskRow = {
  all_day: boolean;
  due_at: string | null;
  id: string;
  occurrence_start_at: string | null;
  recurrence_series_id: string | null;
  start_at: string | null;
  title: string;
};

function mapTask(row: CalendarTaskRow): CalendarTask {
  return {
    allDay: row.all_day,
    dueAt: row.due_at,
    id: row.id,
    recurrenceSeriesId: row.recurrence_series_id,
    reminderOffsets: [],
    startAt: row.start_at ?? row.occurrence_start_at,
    title: row.title,
  };
}

export default async function CalendarPage() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { data } = await listTasks(
    supabase as never,
    user.id,
  ) as unknown as { data: CalendarTaskRow[] | null };
  const tasks = (data ?? []).map(mapTask);

  async function moveTask(
    taskId: string,
    input: Parameters<typeof moveCalendarTask>[1],
  ) {
    "use server";

    const result = await moveCalendarTask(taskId, input);
    return result.ok;
  }

  async function resizeTask(
    taskId: string,
    input: Parameters<typeof resizeCalendarTask>[1],
  ) {
    "use server";

    const result = await resizeCalendarTask(taskId, input);
    return result.ok;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Lịch</h1>
        <p className="mt-2 text-sm text-slate-600">
          Xem và sắp xếp công việc theo tháng, tuần hoặc ngày.
        </p>
      </header>
      <TaskCalendar
        onMove={moveTask}
        onResize={resizeTask}
        tasks={tasks}
      />
    </div>
  );
}
