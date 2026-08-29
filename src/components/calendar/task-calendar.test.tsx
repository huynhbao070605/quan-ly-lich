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
    status: "DONE",
    priority: "LOW",
  },
  {
    id: "task-2",
    title: "Họp sprint",
    startAt: "2026-08-24T03:00:00.000Z",
    dueAt: "2026-08-24T04:00:00.000Z",
    allDay: false,
    recurrenceSeriesId: "series-1",
    reminderOffsets: [60],
    status: "IN_PROGRESS",
    priority: "HIGH",
  },
  {
    id: "task-3",
    title: "Viết báo cáo",
    startAt: "2026-08-25T03:00:00.000Z",
    dueAt: "2026-08-25T04:00:00.000Z",
    allDay: false,
    recurrenceSeriesId: null,
    reminderOffsets: [],
    status: "TODO",
    priority: "MEDIUM",
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
          status: "DONE",
          priority: "LOW",
        },
        classNames: ["calendar-event--done"],
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
          status: "IN_PROGRESS",
          priority: "HIGH",
        },
        classNames: ["calendar-event--in-progress"],
      },
      {
        id: "task-3",
        title: "Viết báo cáo",
        start: "2026-08-25T03:00:00.000Z",
        end: "2026-08-25T04:00:00.000Z",
        allDay: false,
        extendedProps: {
          recurrenceSeriesId: null,
          reminderOffsets: [],
          status: "TODO",
          priority: "MEDIUM",
        },
        classNames: ["calendar-event--todo"],
      },
    ]);
  });

  test("renders Vietnamese view controls and mobile agenda", () => {
    render(<TaskCalendar onMove={vi.fn()} onResize={vi.fn()} tasks={tasks} />);

    expect(screen.getByRole("button", { name: "Tháng" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Tuần" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Ngày" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Hôm nay" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Tháng trước" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Tháng sau" })).toBeVisible();
    expect(screen.getByText("Tổng công việc")).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
    expect(screen.getByText("Hoàn thành")).toBeVisible();
    expect(screen.getByText("Đang thực hiện")).toBeVisible();
    expect(screen.getByText("Cần làm")).toBeVisible();
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
