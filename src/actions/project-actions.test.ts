import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archiveProjectRecord: vi.fn(),
  createProjectRecord: vi.fn(),
  createServerClient: vi.fn(),
  deleteProjectRecord: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/projects/project-repository", () => ({
  archiveProjectRecord: mocks.archiveProjectRecord,
  createProjectRecord: mocks.createProjectRecord,
  deleteProjectRecord: mocks.deleteProjectRecord,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { archiveProject, createProject, deleteProject } from "./project-actions";

const projectId = "00000000-0000-4000-8000-000000000020";
const projectRecord = {
  id: projectId,
  user_id: "server-user-id",
  name: "Công việc cá nhân",
  color: "#0f766e",
  icon: "folder",
  archived: false,
  created_at: "2026-08-21T01:00:00.000Z",
  updated_at: "2026-08-21T01:00:00.000Z",
};

describe("project actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
    mocks.createProjectRecord.mockResolvedValue(projectRecord);
    mocks.archiveProjectRecord.mockResolvedValue({
      ...projectRecord,
      archived: true,
    });
    mocks.deleteProjectRecord.mockResolvedValue(undefined);
  });

  test("createProject trims the name and ignores caller-provided userId", async () => {
    const result = await createProject({
      name: "  Công việc cá nhân  ",
      color: "#0f766e",
      icon: "folder",
      userId: "caller-user-id",
    } as never);

    expect(result).toEqual({ ok: true, data: projectRecord });
    expect(mocks.createProjectRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      expect.objectContaining({
        name: "Công việc cá nhân",
        color: "#0f766e",
        icon: "folder",
      }),
    );
    expect(mocks.createProjectRecord).not.toHaveBeenCalledWith(
      expect.anything(),
      "caller-user-id",
      expect.anything(),
    );
  });

  test("createProject rejects invalid names before auth or repository access", async () => {
    const result = await createProject({ name: "" });

    expect(result).toEqual({
      ok: false,
      message: "Tên dự án phải có từ 1 đến 100 ký tự.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createProjectRecord).not.toHaveBeenCalled();
  });

  test("archiveProject scopes the archive to the authenticated user", async () => {
    const result = await archiveProject(projectId);

    expect(result).toEqual({
      ok: true,
      data: { ...projectRecord, archived: true },
    });
    expect(mocks.archiveProjectRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      projectId,
    );
  });

  test("deleteProject deletes the project row for the authenticated user", async () => {
    const result = await deleteProject(projectId);

    expect(result).toEqual({ ok: true, data: null });
    expect(mocks.deleteProjectRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      projectId,
    );
  });
});
