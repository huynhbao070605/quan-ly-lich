import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { deleteCurrentAccount, signOut } from "./account-actions";

describe("account actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects account deletion without the exact DELETE confirmation", async () => {
    const result = await deleteCurrentAccount("delete");

    expect(result).toEqual({
      ok: false,
      message: "Vui lòng nhập DELETE để xác nhận.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("does not create the service-role client before requireUser succeeds", async () => {
    mocks.requireUser.mockRejectedValue(new Error("not authenticated"));

    await expect(deleteCurrentAccount("DELETE")).rejects.toThrow("not authenticated");

    expect(mocks.requireUser).toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("deletes the authenticated auth user and signs out the current session", async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const signOutSession = vi.fn().mockResolvedValue({ error: null });
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createAdminClient.mockReturnValue({ auth: { admin: { deleteUser } } });
    mocks.createServerClient.mockResolvedValue({ auth: { signOut: signOutSession } });

    const result = await deleteCurrentAccount("DELETE");

    expect(result).toEqual({ ok: true, message: "Tài khoản đã được xóa." });
    expect(deleteUser).toHaveBeenCalledWith("server-user-id");
    expect(signOutSession).toHaveBeenCalled();
  });

  test("signOut signs out the session then redirects to login", async () => {
    const signOutSession = vi.fn().mockResolvedValue({ error: null });
    mocks.createServerClient.mockResolvedValue({ auth: { signOut: signOutSession } });

    await expect(signOut()).rejects.toThrow("redirect:/dang-nhap");

    expect(signOutSession).toHaveBeenCalled();
  });
});
