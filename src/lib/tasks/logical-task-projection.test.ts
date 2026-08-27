import { describe, expect, test } from "vitest";

import {
  getLogicalKanbanTasks,
  getTodayLogicalTasks,
  selectRepresentativeOccurrence,
  type LogicalTaskProjectionInput,
} from "./logical-task-projection";

const now = new Date("2026-08-27T03:00:00.000Z"); // 10:00 27/08 in Vietnam.

function task(
  overrides: Partial<LogicalTaskProjectionInput> = {},
): LogicalTaskProjectionInput {
  return {
    allDay: false,
    completedAt: null,
    dueAt: "2026-08-27T14:00:00.000Z",
    id: "task-1",
    occurrenceStartAt: null,
    priority: "MEDIUM",
    recurrenceRule: null,
    recurrenceSeriesId: null,
    startAt: null,
    status: "TODO",
    title: "Task",
    ...overrides,
  };
}

describe("logical task projection", () => {
  test("collapses many occurrences from the same recurrence series into one Kanban card", () => {
    const projected = getLogicalKanbanTasks([
      task({ id: "series-a-27", recurrenceSeriesId: "series-a" }),
      task({
        id: "series-a-28",
        dueAt: "2026-08-28T14:00:00.000Z",
        occurrenceStartAt: "2026-08-28T14:00:00.000Z",
        recurrenceSeriesId: "series-a",
      }),
      task({
        id: "series-a-29",
        dueAt: "2026-08-29T14:00:00.000Z",
        occurrenceStartAt: "2026-08-29T14:00:00.000Z",
        recurrenceSeriesId: "series-a",
      }),
    ], now);

    expect(projected.map((item) => item.id)).toEqual(["series-a-27"]);
  });

  test("keeps non-recurring tasks independent", () => {
    const projected = getLogicalKanbanTasks([
      task({ id: "normal-a", recurrenceSeriesId: null }),
      task({ id: "normal-b", recurrenceSeriesId: null }),
    ], now);

    expect(projected.map((item) => item.id)).toEqual(["normal-a", "normal-b"]);
  });

  test("chooses today's occurrence before future unresolved occurrences", () => {
    const today = task({
      id: "today",
      dueAt: "2026-08-27T14:00:00.000Z",
      recurrenceSeriesId: "series-a",
    });
    const tomorrow = task({
      id: "tomorrow",
      dueAt: "2026-08-28T14:00:00.000Z",
      occurrenceStartAt: "2026-08-28T14:00:00.000Z",
      recurrenceSeriesId: "series-a",
      status: "TODO",
    });

    expect(selectRepresentativeOccurrence([tomorrow, today], now)).toBe(today);
  });

  test("uses the nearest unresolved occurrence when there is no occurrence today", () => {
    const donePast = task({
      id: "done-past",
      dueAt: "2026-08-26T14:00:00.000Z",
      recurrenceSeriesId: "series-a",
      status: "DONE",
    });
    const openFuture = task({
      id: "open-future",
      dueAt: "2026-08-28T14:00:00.000Z",
      recurrenceSeriesId: "series-a",
      status: "TODO",
    });

    expect(selectRepresentativeOccurrence([donePast, openFuture], now)).toBe(openFuture);
  });

  test("today's logical projection excludes future recurring occurrences from analytics", () => {
    const projected = getTodayLogicalTasks([
      task({ id: "series-a-27", recurrenceSeriesId: "series-a" }),
      task({
        id: "series-a-28",
        dueAt: "2026-08-28T14:00:00.000Z",
        recurrenceSeriesId: "series-a",
      }),
      task({
        id: "normal-today",
        priority: "URGENT",
        recurrenceSeriesId: null,
      }),
      task({
        id: "normal-future",
        dueAt: "2026-08-28T14:00:00.000Z",
        recurrenceSeriesId: null,
      }),
    ], now);

    expect(projected.map((item) => item.id)).toEqual(
      expect.arrayContaining(["series-a-27", "normal-today"]),
    );
    expect(projected).toHaveLength(2);
  });

  test("interprets today using the Vietnam day at UTC boundaries", () => {
    const projected = getTodayLogicalTasks([
      task({
        id: "vietnam-midnight",
        dueAt: "2026-08-26T17:30:00.000Z",
      }),
      task({
        id: "previous-vietnam-day",
        dueAt: "2026-08-26T16:30:00.000Z",
      }),
    ], new Date("2026-08-26T17:30:00.000Z"));

    expect(projected.map((item) => item.id)).toEqual(["vietnam-midnight"]);
  });
});
