import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { updateProfile } from "./profile-actions";

function createUpdateClient() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return { client: { from }, eq, from, update };
}

describe("updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects a malformed payload without querying Supabase", async () => {
    const result = await updateProfile(null as never);

    expect(result).toEqual({
      ok: false,
      message: "Tên hiển thị phải có từ 1 đến 80 ký tự.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("updates the profile belonging to the authenticated user, not a caller-supplied user", async () => {
    const updateClient = createUpdateClient();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue(updateClient.client);

    const result = await updateProfile({
      displayName: "An Nguyen",
      userId: "caller-user-id",
    } as never);

    expect(result).toEqual({ ok: true, message: "Đã cập nhật hồ sơ." });
    expect(updateClient.from).toHaveBeenCalledWith("profiles");
    expect(updateClient.update).toHaveBeenCalledWith({ display_name: "An Nguyen" });
    expect(updateClient.eq).toHaveBeenCalledWith("id", "server-user-id");
    expect(updateClient.eq).not.toHaveBeenCalledWith("id", "caller-user-id");
  });
});
