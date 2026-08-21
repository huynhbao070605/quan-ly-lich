import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  listProjectSummaries: vi.fn(),
  listTagRecords: vi.fn(),
  listTasks: vi.fn(),
  refresh: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/tasks/task-queries", () => ({ listTasks: mocks.listTasks }));
vi.mock("@/lib/projects/project-repository", () => ({
  listProjectSummaries: mocks.listProjectSummaries,
}));
vi.mock("@/lib/tags/tag-repository", () => ({
  listTagRecords: mocks.listTagRecords,
}));

import TasksPage from "./page";

const taskId = "00000000-0000-4000-8000-000000000010";
const projectId = "00000000-0000-4000-8000-000000000020";
const tagId = "00000000-0000-4000-8000-000000000030";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
  mocks.listTasks.mockResolvedValue({
    data: [{
      id: taskId,
      title: "Nộp báo cáo",
      description: null,
      status: "TODO",
      priority: "HIGH",
      project_id: projectId,
      start_at: null,
      due_at: null,
      all_day: true,
      important: true,
      urgent: false,
      eisenhower_override: false,
      projects: { id: projectId, name: "Công việc" },
      task_tags: [{ tags: { id: tagId, name: "Gấp" } }],
      subtasks: [],
    }],
  });
  mocks.listProjectSummaries.mockResolvedValue([{ id: projectId, name: "Công việc" }]);
  mocks.listTagRecords.mockResolvedValue([{ id: tagId, name: "Gấp" }]);
});

afterEach(cleanup);

test("applies URL filters, loads options, and opens a taskId deep link", async () => {
  const page = await TasksPage({
    searchParams: Promise.resolve({
      query: "báo cáo",
      projectId,
      tagId,
      priority: "HIGH",
      status: "TODO",
      taskId,
    }),
  });
  render(page);

  expect(mocks.listTasks).toHaveBeenCalledWith(
    expect.anything(),
    "server-user-id",
    {
      query: "báo cáo",
      projectId,
      tagIds: [tagId],
      priority: "HIGH",
      status: "TODO",
    },
  );
  const filters = screen.getByRole("form", { name: "Lọc công việc" });
  expect(within(filters).getByLabelText("Dự án")).toHaveValue(projectId);
  expect(within(filters).getByLabelText("Thẻ")).toHaveValue(tagId);
  expect(screen.getByRole("dialog", { name: "Chi tiết công việc" })).toBeVisible();
});
