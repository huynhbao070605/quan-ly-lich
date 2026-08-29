import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getTaskList: vi.fn(),
  refresh: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/tasks/task-queries", () => ({ getTaskList: mocks.getTaskList }));

import DailyPlanPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
  mocks.getTaskList.mockResolvedValue([
    {
      id: "00000000-0000-4000-8000-000000000011",
      title: "Gọi khách hàng",
      status: "TODO",
      priority: "MEDIUM",
      start_at: null,
      due_at: new Date().toISOString(),
      all_day: false,
      completed_at: null,
      focus_date: null,
      focus_position: null,
      projects: null,
    },
  ]);
});

afterEach(cleanup);

test("renders Focus selection controls from the Daily Plan route", async () => {
  render(await DailyPlanPage());

  expect(
    screen.getAllByRole("button", { name: "Thêm Gọi khách hàng vào trọng tâm" }),
  ).not.toHaveLength(0);
});
