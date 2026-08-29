import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getTaskList: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/actions/calendar-actions", () => ({
  moveCalendarTask: vi.fn(),
  resizeCalendarTask: vi.fn(),
}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/tasks/task-queries", () => ({ getTaskList: mocks.getTaskList }));

import CalendarPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
  mocks.getTaskList.mockResolvedValue([
    {
      all_day: false,
      due_at: "2026-08-27T03:00:00.000Z",
      id: "task-a",
      occurrence_start_at: null,
      priority: "MEDIUM",
      recurrence_series_id: null,
      start_at: null,
      status: "TODO",
      task_reminders: [],
      title: "Plain task",
    },
  ]);
});

afterEach(cleanup);

test("loads Calendar tasks through the shared task loader", async () => {
  render(await CalendarPage());

  expect(mocks.getTaskList).toHaveBeenCalledWith(expect.anything(), "server-user-id");
  expect(screen.getAllByText("Plain task").length).toBeGreaterThan(0);
});
