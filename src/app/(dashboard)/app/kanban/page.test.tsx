import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  listTasks: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/tasks/task-queries", () => ({ listTasks: mocks.listTasks }));

import KanbanPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
  mocks.listTasks.mockResolvedValue({ data: [] });
});

test("passes a valid projectId deep link to the Kanban task query", async () => {
  const projectId = "00000000-0000-4000-8000-000000000020";

  await KanbanPage({ searchParams: Promise.resolve({ projectId }) });

  expect(mocks.listTasks).toHaveBeenCalledWith(
    expect.anything(),
    "server-user-id",
    { projectId },
  );
});
