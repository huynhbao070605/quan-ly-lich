import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archiveProject: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/actions/project-actions", () => ({
  archiveProject: mocks.archiveProject,
  createProject: mocks.createProject,
  deleteProject: mocks.deleteProject,
}));

import { ProjectsWorkspace } from "./projects-workspace";

const project = {
  id: "00000000-0000-4000-8000-000000000020",
  user_id: "server-user-id",
  name: "Công việc",
  color: "#0f766e",
  icon: null,
  archived: false,
  created_at: "2026-08-21T00:00:00.000Z",
  updated_at: "2026-08-21T00:00:00.000Z",
  task_count: 2,
  done_count: 1,
};

describe("ProjectsWorkspace", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createProject.mockResolvedValue({ ok: true, data: project });
    mocks.archiveProject.mockResolvedValue({ ok: true, data: project });
    mocks.deleteProject.mockResolvedValue({ ok: true, data: null });
  });

  test("creates a project from the shipped projects route surface", async () => {
    const user = userEvent.setup();
    render(<ProjectsWorkspace projects={[project]} />);

    await user.click(screen.getByRole("button", { name: "Dự án mới" }));
    await user.type(screen.getByLabelText("Tên dự án"), "Kế hoạch quý");
    await user.click(screen.getByRole("button", { name: "Tạo dự án" }));

    expect(mocks.createProject).toHaveBeenCalledWith({
      name: "Kế hoạch quý",
      color: "#0f766e",
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  test("archives and deletes an owned project from its card", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProjectsWorkspace projects={[project]} />);

    await user.click(screen.getByRole("button", { name: "Lưu trữ Công việc" }));
    expect(mocks.archiveProject).toHaveBeenCalledWith(project.id);

    await user.click(screen.getByRole("button", { name: "Xóa Công việc" }));
    expect(mocks.deleteProject).toHaveBeenCalledWith(project.id);
  });
});
