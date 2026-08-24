"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useRef, useState } from "react";

import { RecurrenceEditDialog } from "@/components/calendar/recurrence-edit-dialog";
import { CalendarAgendaMobile } from "./calendar-agenda-mobile";

export type CalendarTask = {
  allDay: boolean;
  dueAt: string | null;
  id: string;
  recurrenceSeriesId: string | null;
  reminderOffsets: number[];
  startAt: string | null;
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
    end: task.dueAt ?? undefined,
    extendedProps: {
      recurrenceSeriesId: task.recurrenceSeriesId,
      reminderOffsets: task.reminderOffsets,
    },
    id: task.id,
    start: task.startAt ?? task.dueAt ?? undefined,
    title: task.title,
  }));
}

export function TaskCalendar({
  onMove,
  onResize,
  onSelectTask,
  tasks,
}: TaskCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [view, setView] = useState("dayGridMonth");
  const [pendingChange, setPendingChange] = useState<PendingCalendarChange | null>(null);

  function changeView(nextView: string) {
    setView(nextView);
    calendarRef.current?.getApi().changeView(nextView);
  }

  function goToday() {
    calendarRef.current?.getApi().today();
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
      <div className="flex flex-wrap items-center gap-2">
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
