import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getTaskList: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/tasks/task-queries", () => ({ getTaskList: mocks.getTaskList }));

import EisenhowerPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-27T03:00:00.000Z"));
  mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
  mocks.getTaskList.mockResolvedValue([
    {
      all_day: false,
      due_at: "2026-08-27T03:00:00.000Z",
      eisenhower_override: false,
      id: "task-a",
      important: true,
      occurrence_start_at: null,
      priority: "HIGH",
      projects: null,
      recurrence_series: null,
      recurrence_series_id: null,
      start_at: null,
      status: "TODO",
      title: "Plain task",
      urgent: false,
    },
  ]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("loads Eisenhower tasks through the shared task loader", async () => {
  render(await EisenhowerPage());

  expect(mocks.getTaskList).toHaveBeenCalledWith(expect.anything(), "server-user-id");
  expect(screen.getByText("Plain task")).toBeInTheDocument();
});
