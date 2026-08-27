"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

import { RecurrenceEditDialog } from "@/components/calendar/recurrence-edit-dialog";
import { getStatusPresentation } from "@/lib/domain/task-display";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";
import { CalendarAgendaMobile } from "./calendar-agenda-mobile";

export type CalendarTask = {
  allDay: boolean;
  dueAt: string | null;
  id: string;
  recurrenceSeriesId: string | null;
  reminderOffsets: number[];
  startAt: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  title: string;
};

type CalendarMoveInput = {
  allDay: boolean;
  dueAt: string | null;
  reminderOffsets: number[];
  startAt: string | null;
};

type CalendarResizeInput = {
  dueAt: string | null;
  reminderOffsets: number[];
  startAt: string | null;
};

type TaskCalendarProps = {
  onMove: (taskId: string, input: CalendarMoveInput) => Promise<boolean> | boolean;
  onResize: (taskId: string, input: CalendarResizeInput) => Promise<boolean> | boolean;
  onSelectTask?: (taskId: string) => void;
  tasks: CalendarTask[];
};

type PendingCalendarChange = {
  apply: () => Promise<void>;
  revert: () => void;
};

const views = [
  { label: "Tháng", value: "dayGridMonth" },
  { label: "Tuần", value: "timeGridWeek" },
  { label: "Ngày", value: "timeGridDay" },
];

function toIso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function getEventPayload(event: {
  allDay: boolean;
  end: Date | null;
  extendedProps: Record<string, unknown>;
  id: string;
  start: Date | null;
}): CalendarMoveInput {
  return {
    allDay: event.allDay,
    dueAt: toIso(event.end),
    reminderOffsets: Array.isArray(event.extendedProps.reminderOffsets)
      ? event.extendedProps.reminderOffsets as number[]
      : [],
    startAt: toIso(event.start),
  };
}

export function mapTasksToCalendarEvents(tasks: CalendarTask[]): EventInput[] {
  return tasks.map((task) => ({
    allDay: task.allDay,
    classNames: [getStatusPresentation(task.status).calendarClassName],
    end: task.dueAt ?? undefined,
    extendedProps: {
      priority: task.priority,
      recurrenceSeriesId: task.recurrenceSeriesId,
      reminderOffsets: task.reminderOffsets,
      status: task.status,
    },
    id: task.id,
    start: task.startAt ?? task.dueAt ?? undefined,
    title: task.title,
  }));
}

function calendarSummary(tasks: CalendarTask[]) {
  return {
    total: tasks.length,
    done: tasks.filter((task) => task.status === "DONE").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    todo: tasks.filter((task) => task.status === "TODO").length,
  };
}

export function TaskCalendar({
  onMove,
  onResize,
  onSelectTask,
  tasks,
}: TaskCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const summary = calendarSummary(tasks);
  const [view, setView] = useState("dayGridMonth");
  const [pendingChange, setPendingChange] = useState<PendingCalendarChange | null>(null);

  function changeView(nextView: string) {
    setView(nextView);
    calendarRef.current?.getApi().changeView(nextView);
  }

  function goToday() {
    calendarRef.current?.getApi().today();
  }

  function goPrevious() {
    calendarRef.current?.getApi().prev();
  }

  function goNext() {
    calendarRef.current?.getApi().next();
  }

  async function applyOrRollback(
    apply: () => Promise<boolean> | boolean,
    revert: () => void,
  ) {
    const ok = await apply();

    if (!ok) {
      revert();
    }
  }

  function maybeHandleRecurring(
    event: { extendedProps: Record<string, unknown> },
    apply: () => Promise<void>,
    revert: () => void,
  ): boolean {
    if (!event.extendedProps.recurrenceSeriesId) {
      return false;
    }

    setPendingChange({ apply, revert });
    return true;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-label="Tháng trước"
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={goPrevious}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-label="Tháng sau"
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={goNext}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
          {views.map((item) => (
            <button
              aria-pressed={view === item.value}
              className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 aria-pressed:text-teal-700"
              key={item.value}
              onClick={() => changeView(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
          <button
            className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
            onClick={goToday}
            type="button"
          >
            Hôm nay
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng công việc", value: summary.total },
          { label: "Hoàn thành", value: summary.done },
          { label: "Đang thực hiện", value: summary.inProgress },
          { label: "Cần làm", value: summary.todo },
        ].map((item) => (
          <article className="rounded-md border border-slate-200 bg-white p-3" key={item.label}>
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p>
          </article>
        ))}
      </div>

      <CalendarAgendaMobile onSelectTask={onSelectTask} tasks={tasks} />

      <div className="hidden min-h-[680px] rounded-md border border-slate-200 bg-white p-3 md:block">
        <FullCalendar
          allDayText="Cả ngày"
          buttonText={{
            day: "Ngày",
            month: "Tháng",
            today: "Hôm nay",
            week: "Tuần",
          }}
          editable
          eventClick={(info) => onSelectTask?.(info.event.id)}
          eventContent={(info) => {
            const status = info.event.extendedProps.status as TaskStatus | undefined;
            const statusLabel = status ? getStatusPresentation(status).label : "";

            return (
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">{info.event.title}</span>
                {statusLabel ? (
                  <span className="truncate text-[10px] opacity-80">{statusLabel}</span>
                ) : null}
              </span>
            );
          }}
          eventDrop={async (info) => {
            const payload = getEventPayload(info.event);
            const apply = () => applyOrRollback(
              () => onMove(info.event.id, payload),
              info.revert,
            );

            if (maybeHandleRecurring(info.event, apply, info.revert)) {
              return;
            }

            await apply();
          }}
          eventResize={async (info) => {
            const payload = getEventPayload(info.event);
            const resizePayload = {
              dueAt: payload.dueAt,
              reminderOffsets: payload.reminderOffsets,
              startAt: payload.startAt,
            };
            const apply = () => applyOrRollback(
              () => onResize(info.event.id, resizePayload),
              info.revert,
            );

            if (maybeHandleRecurring(info.event, apply, info.revert)) {
              return;
            }

            await apply();
          }}
          events={mapTasksToCalendarEvents(tasks)}
          headerToolbar={false}
          height="auto"
          initialView={view}
          locale="vi"
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          ref={calendarRef}
        />
      </div>

      <RecurrenceEditDialog
        onCancel={() => {
          pendingChange?.revert();
          setPendingChange(null);
        }}
        onOccurrenceOnly={() => {
          void pendingChange?.apply().finally(() => setPendingChange(null));
        }}
        onThisAndFuture={() => {
          void pendingChange?.apply().finally(() => setPendingChange(null));
        }}
        open={pendingChange !== null}
      />
    </div>
  );
}
