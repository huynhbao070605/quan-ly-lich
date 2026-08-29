import type { CalendarTask } from "./task-calendar";

type CalendarAgendaMobileProps = {
  onSelectTask?: (taskId: string) => void;
  tasks: CalendarTask[];
};

function formatTime(value: string | null): string {
  if (value === null) {
    return "Chưa có giờ";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function CalendarAgendaMobile({
  onSelectTask,
  tasks,
}: CalendarAgendaMobileProps) {
  return (
    <div className="space-y-2 md:hidden">
      {tasks.map((task) => (
        <button
          className="w-full rounded-md border border-slate-200 bg-white p-3 text-left text-sm shadow-sm"
          key={task.id}
          onClick={() => onSelectTask?.(task.id)}
          type="button"
        >
          <span className="block font-medium text-slate-950">{task.title}</span>
          <span className="mt-1 block text-slate-600">
            {task.allDay ? "Cả ngày" : formatTime(task.startAt ?? task.dueAt)}
          </span>
        </button>
      ))}
    </div>
  );
}
