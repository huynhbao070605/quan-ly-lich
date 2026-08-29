import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  getKanbanBoardTasks,
  getPriorityBreakdown,
  getTodayPriorityBreakdown,
  KanbanBoard,
} from "./kanban-board";
import type { KanbanTask } from "./task-card";

vi.mock("@/actions/kanban-actions", () => ({
  moveTaskBetweenColumns: vi.fn(),
  reorderColumn: vi.fn(),
}));

const baseTask: KanbanTask = {
  id: "task-1",
  title: "Nộp báo cáo",
  status: "TODO",
  priority: "LOW",
  dueAt: null,
  project: null,
  position: 0,
};

const now = new Date("2026-08-27T03:00:00.000Z");

function columnByName(name: string) {
  return screen.getByRole("heading", { name }).closest("section")!;
}

function cardsInColumn(columnName: string, cardName = "Nộp báo cáo") {
  return within(columnByName(columnName)).queryAllByRole("article", {
    name: cardName,
  });
}

describe("KanbanBoard", () => {
  afterEach(() => {
    cleanup();
  });

  test("builds Kanban priority distribution from the displayed task dataset", () => {
    const data = getPriorityBreakdown([
      baseTask,
      { ...baseTask, id: "task-2", priority: "MEDIUM" },
      { ...baseTask, id: "task-3", priority: "HIGH" },
      { ...baseTask, id: "task-4", priority: "URGENT" },
      { ...baseTask, id: "task-5", priority: "URGENT" },
    ]);

    expect(data).toEqual([
      expect.objectContaining({ priority: "LOW", label: "Thấp", count: 1 }),
      expect.objectContaining({ priority: "MEDIUM", label: "Trung bình", count: 1 }),
      expect.objectContaining({ priority: "HIGH", label: "Cao", count: 1 }),
      expect.objectContaining({ priority: "URGENT", label: "Khẩn cấp", count: 2 }),
    ]);
  });

  test("collapses recurring occurrences into one logical Kanban card", () => {
    const cards = getKanbanBoardTasks([
      {
        ...baseTask,
        id: "series-a-27",
        dueAt: "2026-08-27T14:00:00.000Z",
        recurrenceSeriesId: "series-a",
      },
      {
        ...baseTask,
        id: "series-a-28",
        dueAt: "2026-08-28T14:00:00.000Z",
        occurrenceStartAt: "2026-08-28T14:00:00.000Z",
        recurrenceSeriesId: "series-a",
      },
      {
        ...baseTask,
        id: "normal",
        dueAt: "2026-08-27T09:00:00.000Z",
      },
    ], now);

    expect(cards.map((task) => task.id)).toEqual(["normal", "series-a-27"]);
  });

  test("selects the real occurrence id for a recurring Kanban card that starts today", () => {
    const cards = getKanbanBoardTasks([
      {
        ...baseTask,
        id: "zzz-series-a-starts-today",
        dueAt: "2026-08-28T02:00:00.000Z",
        occurrenceStartAt: "2026-08-27T01:00:00.000Z",
        recurrenceSeriesId: "series-a",
      },
      {
        ...baseTask,
        id: "aaa-series-a-starts-tomorrow",
        dueAt: "2026-08-28T02:00:00.000Z",
        occurrenceStartAt: "2026-08-28T01:00:00.000Z",
        recurrenceSeriesId: "series-a",
      },
    ], now);

    expect(cards.map((task) => task.id)).toEqual(["zzz-series-a-starts-today"]);
    expect(cards.map((task) => task.id)).not.toContain("series-a");
  });

  test("builds today's Kanban priority distribution without future recurrence inflation", () => {
    const data = getTodayPriorityBreakdown([
      {
        ...baseTask,
        id: "series-a-27",
        dueAt: "2026-08-27T14:00:00.000Z",
        priority: "MEDIUM",
        recurrenceSeriesId: "series-a",
      },
      {
        ...baseTask,
        id: "series-a-28",
        dueAt: "2026-08-28T14:00:00.000Z",
        priority: "HIGH",
        recurrenceSeriesId: "series-a",
      },
      {
        ...baseTask,
        id: "urgent-today",
        dueAt: "2026-08-27T09:00:00.000Z",
        priority: "URGENT",
      },
    ], now);

    expect(data).toEqual([
      expect.objectContaining({ priority: "LOW", count: 0 }),
      expect.objectContaining({ priority: "MEDIUM", count: 1 }),
      expect.objectContaining({ priority: "HIGH", count: 0 }),
      expect.objectContaining({ priority: "URGENT", count: 1 }),
    ]);
  });

  test("syncs cards when refreshed server tasks move to another status", () => {
    const { rerender } = render(<KanbanBoard tasks={[baseTask]} />);

    expect(cardsInColumn("Cần làm")).toHaveLength(1);
    expect(cardsInColumn("Đang thực hiện")).toHaveLength(0);

    rerender(<KanbanBoard tasks={[{ ...baseTask, status: "IN_PROGRESS" }]} />);

    expect(cardsInColumn("Cần làm")).toHaveLength(0);
    expect(cardsInColumn("Đang thực hiện")).toHaveLength(1);
  });

  test("marks recurring cards with a recurrence summary", () => {
    render(
      <KanbanBoard
        tasks={[
          {
            ...baseTask,
            recurrenceRule: {
              frequency: "DAILY",
              interval: 1,
              weekdays: undefined,
              monthDay: null,
              endsAt: null,
            },
            recurrenceSeriesId: "series-a",
          },
        ]}
      />,
    );

    expect(screen.getByText("Hằng ngày")).toBeVisible();
  });
});
