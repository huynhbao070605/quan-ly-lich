import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

let calendarProps: Record<string, unknown> = {};

vi.mock("@fullcalendar/react", () => ({
  default: (props: Record<string, unknown>) => {
    calendarProps = props;
    return <div data-testid="fullcalendar" />;
  },
}));

import {
  TaskCalendar,
  mapTasksToCalendarEvents,
  type CalendarTask,
} from "./task-calendar";

const tasks: CalendarTask[] = [
  {
    id: "task-1",
    title: "Nghỉ phép",
    startAt: "2026-08-24T00:00:00.000Z",
    dueAt: "2026-08-24T00:00:00.000Z",
    allDay: true,
    recurrenceSeriesId: null,
    reminderOffsets: [1440, 0],
  },
  {
    id: "task-2",
    title: "Họp sprint",
    startAt: "2026-08-24T03:00:00.000Z",
    dueAt: "2026-08-24T04:00:00.000Z",
    allDay: false,
    recurrenceSeriesId: "series-1",
    reminderOffsets: [60],
  },
];

describe("TaskCalendar", () => {
  test("maps all-day and timed tasks to FullCalendar events", () => {
    expect(mapTasksToCalendarEvents(tasks)).toEqual([
      {
        id: "task-1",
        title: "Nghỉ phép",
        start: "2026-08-24T00:00:00.000Z",
        end: "2026-08-24T00:00:00.000Z",
        allDay: true,
        extendedProps: {
          recurrenceSeriesId: null,
          reminderOffsets: [1440, 0],
        },
      },
      {
        id: "task-2",
        title: "Họp sprint",
        start: "2026-08-24T03:00:00.000Z",
        end: "2026-08-24T04:00:00.000Z",
        allDay: false,
        extendedProps: {
          recurrenceSeriesId: "series-1",
          reminderOffsets: [60],
        },
      },
    ]);
  });

  test("renders Vietnamese view controls and mobile agenda", () => {
    render(<TaskCalendar onMove={vi.fn()} onResize={vi.fn()} tasks={tasks} />);

    expect(screen.getByRole("button", { name: "Tháng" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Tuần" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Ngày" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Hôm nay" })).toBeVisible();
    expect(screen.getByText("Họp sprint")).toBeVisible();
  });

  test("rolls back a drag when the server update fails", async () => {
    const onMove = vi.fn().mockResolvedValue(false);
    const revert = vi.fn();
    render(<TaskCalendar onMove={onMove} onResize={vi.fn()} tasks={tasks} />);

    await (calendarProps.eventDrop as (input: unknown) => Promise<void>)({
      event: {
        id: "task-2",
        start: new Date("2026-08-25T03:00:00.000Z"),
        end: new Date("2026-08-25T04:00:00.000Z"),
        allDay: false,
        extendedProps: {
          reminderOffsets: [60],
          recurrenceSeriesId: null,
        },
      },
      revert,
    });

    expect(onMove).toHaveBeenCalledWith("task-2", {
      allDay: false,
      dueAt: "2026-08-25T04:00:00.000Z",
      reminderOffsets: [60],
      startAt: "2026-08-25T03:00:00.000Z",
    });
    expect(revert).toHaveBeenCalledTimes(1);
  });
});
