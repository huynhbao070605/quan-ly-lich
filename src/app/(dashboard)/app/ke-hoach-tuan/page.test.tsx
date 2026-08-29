import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getDashboardSummary: vi.fn(),
  getTaskList: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/dashboard/queries", () => ({
  getDashboardSummary: mocks.getDashboardSummary,
}));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/tasks/task-queries", () => ({ getTaskList: mocks.getTaskList }));

import WeeklyPlanPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
  mocks.getDashboardSummary.mockResolvedValue({ projectProgress: [] });
  mocks.getTaskList.mockResolvedValue([
    {
      all_day: false,
      completed_at: null,
      due_at: new Date().toISOString(),
      id: "task-a",
      priority: "MEDIUM",
      projects: null,
      start_at: null,
      status: "TODO",
      title: "Plain task",
    },
  ]);
});

afterEach(cleanup);

test("loads Weekly Plan tasks through the shared task loader", async () => {
  render(await WeeklyPlanPage());

  expect(mocks.getTaskList).toHaveBeenCalledWith(expect.anything(), "server-user-id");
  expect(screen.getAllByText("Plain task").length).toBeGreaterThan(0);
});
