import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  listProjectSummaries: vi.fn(),
  refresh: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/projects/project-repository", () => ({
  listProjectSummaries: mocks.listProjectSummaries,
}));

import ProjectsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
  mocks.listProjectSummaries.mockResolvedValue([]);
});

afterEach(cleanup);

test("renders the functional project creation form from the projects route", async () => {
  const user = userEvent.setup();
  render(await ProjectsPage());

  await user.click(screen.getByRole("button", { name: "Dự án mới" }));

  expect(screen.getByLabelText("Tên dự án")).toBeVisible();
  expect(screen.getByRole("button", { name: "Tạo dự án" })).toBeVisible();
});
