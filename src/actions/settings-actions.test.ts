import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { updateAppearance } from "./settings-actions";

function createUpdateClient() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return { client: { from }, eq, from, update };
}

describe("updateAppearance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects an invalid theme without querying Supabase", async () => {
    const result = await updateAppearance({ theme: "sepia" } as never);

    expect(result).toEqual({
      ok: false,
      message: "Giao diện đã chọn không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("rejects a malformed payload without querying Supabase", async () => {
    const result = await updateAppearance(null as never);

    expect(result).toEqual({
      ok: false,
      message: "Giao diện đã chọn không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("updates settings for the authenticated user, not a caller-supplied user", async () => {
    const updateClient = createUpdateClient();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createServerClient.mockResolvedValue(updateClient.client);

    const result = await updateAppearance({
      theme: "dark",
      userId: "caller-user-id",
    } as never);

    expect(result).toEqual({ ok: true, message: "Đã lưu tùy chọn giao diện." });
    expect(updateClient.from).toHaveBeenCalledWith("user_settings");
    expect(updateClient.update).toHaveBeenCalledWith({ theme: "dark" });
    expect(updateClient.eq).toHaveBeenCalledWith("user_id", "server-user-id");
    expect(updateClient.eq).not.toHaveBeenCalledWith("user_id", "caller-user-id");
  });
});
