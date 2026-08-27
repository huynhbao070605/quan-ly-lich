import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  EisenhowerBoard,
  getEisenhowerTodayTasks,
  type EisenhowerTask,
} from "./eisenhower-board";

vi.mock("@/actions/eisenhower-actions", () => ({
  overrideEisenhower: vi.fn(),
  resetEisenhower: vi.fn(),
}));

const baseTask: EisenhowerTask = {
  id: "00000000-0000-4000-8000-000000000010",
  title: "Nộp báo cáo",
  status: "TODO",
  priority: "HIGH",
  dueAt: "2026-08-27T08:00:00.000Z",
  important: true,
  urgent: true,
  eisenhowerOverride: true,
  project: null,
};

function articlesInQuadrant(label: string) {
  return screen
    .getAllByRole("heading", { name: label })
    .flatMap((heading) =>
      within(heading.closest("section")!).queryAllByRole("article", {
        name: "Nộp báo cáo",
      }),
    );
}

describe("EisenhowerBoard", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test("syncs quadrant groups when refreshed tasks change after reset", () => {
    const { rerender } = render(<EisenhowerBoard tasks={[baseTask]} />);

    expect(articlesInQuadrant("Làm ngay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Thủ công").length).toBeGreaterThan(0);

    rerender(
      <EisenhowerBoard
        tasks={[
          {
            ...baseTask,
            urgent: false,
            eisenhowerOverride: false,
          },
        ]}
      />,
    );

    expect(articlesInQuadrant("Làm ngay")).toHaveLength(0);
    expect(articlesInQuadrant("Lên kế hoạch").length).toBeGreaterThan(0);
    expect(screen.queryByText("Thủ công")).not.toBeInTheDocument();
    expect(screen.getAllByText("Tự động").length).toBeGreaterThan(0);
  });

  test("uses action-oriented Vietnamese quadrant names and visible status summary", () => {
    render(
      <EisenhowerBoard
        tasks={[
          baseTask,
          {
            ...baseTask,
            id: "00000000-0000-4000-8000-000000000011",
            status: "DONE",
            title: "Việc đã xong",
          },
        ]}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "Làm ngay" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "Lên kế hoạch" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "Xử lý / Ủy quyền" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "Có thể bỏ" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cần làm").length).toBeGreaterThan(0);
    expect(screen.getByText("Chưa hoàn thành")).toBeVisible();
    expect(screen.getByText("Đã hoàn thành")).toBeVisible();
  });

  test("projects recurring tasks to today's logical Eisenhower occurrences", () => {
    const projected = getEisenhowerTodayTasks([
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
        id: "normal-future",
        dueAt: "2026-08-28T09:00:00.000Z",
      },
    ], new Date("2026-08-27T03:00:00.000Z"));

    expect(projected.map((task) => task.id)).toEqual(["series-a-27"]);
  });

  test("summarizes only today's logical Eisenhower tasks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T03:00:00.000Z"));

    render(
      <EisenhowerBoard
        tasks={[
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
            id: "done-today",
            dueAt: "2026-08-27T09:00:00.000Z",
            status: "DONE",
          },
          {
            ...baseTask,
            id: "normal-future",
            dueAt: "2026-08-28T09:00:00.000Z",
          },
        ]}
      />,
    );

    expect(within(screen.getByText("Chưa hoàn thành").closest("article")!).getByText("1")).toBeVisible();
    expect(within(screen.getByText("Đã hoàn thành").closest("article")!).getByText("1")).toBeVisible();
  });

  test("marks recurring Eisenhower cards with a recurrence summary", () => {
    render(
      <EisenhowerBoard
        tasks={[
          {
            ...baseTask,
            dueAt: "2026-08-27T14:00:00.000Z",
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

    expect(screen.getAllByText("Hằng ngày").length).toBeGreaterThan(0);
  });
});
