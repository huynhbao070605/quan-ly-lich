import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createTagRecord: vi.fn(),
  deleteTagRecord: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/tags/tag-repository", () => ({
  createTagRecord: mocks.createTagRecord,
  deleteTagRecord: mocks.deleteTagRecord,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createTag, deleteTag } from "./tag-actions";

const tagId = "00000000-0000-4000-8000-000000000030";
const tagRecord = {
  id: tagId,
  user_id: "server-user-id",
  name: "Sâu",
  color: "#7c3aed",
  created_at: "2026-08-21T01:00:00.000Z",
};

describe("tag actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
    mocks.createTagRecord.mockResolvedValue(tagRecord);
    mocks.deleteTagRecord.mockResolvedValue(undefined);
  });

  test("createTag trims the name and ignores caller-provided userId", async () => {
    const result = await createTag({
      name: "  Sâu  ",
      color: "#7c3aed",
      userId: "caller-user-id",
    } as never);

    expect(result).toEqual({ ok: true, data: tagRecord });
    expect(mocks.createTagRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      expect.objectContaining({
        name: "Sâu",
        color: "#7c3aed",
      }),
    );
    expect(mocks.createTagRecord).not.toHaveBeenCalledWith(
      expect.anything(),
      "caller-user-id",
      expect.anything(),
    );
  });

  test("createTag rejects invalid names before auth or repository access", async () => {
    const result = await createTag({ name: "" });

    expect(result).toEqual({
      ok: false,
      message: "Tên thẻ phải có từ 1 đến 100 ký tự.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createTagRecord).not.toHaveBeenCalled();
  });

  test("deleteTag deletes the scoped tag row for the authenticated user", async () => {
    const result = await deleteTag(tagId);

    expect(result).toEqual({ ok: true, data: null });
    expect(mocks.deleteTagRecord).toHaveBeenCalledWith(
      expect.anything(),
      "server-user-id",
      tagId,
    );
  });

  test("deleteTag reports not found when no scoped tag row is deleted", async () => {
    mocks.deleteTagRecord.mockRejectedValue(new Error("Tag not found."));

    const result = await deleteTag(tagId);

    expect(result).toEqual({
      ok: false,
      message: "Không tìm thấy thẻ.",
    });
  });
});
