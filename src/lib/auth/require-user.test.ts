import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { requireUser } from "./require-user";

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns the authenticated user from the server Supabase client", async () => {
    const user = { id: "user-123", email: "user@example.com" };
    mocks.createServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user } }),
      },
    });

    await expect(requireUser()).resolves.toBe(user);
  });

  test("redirects unauthenticated visitors to /dang-nhap", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/dang-nhap");
  });
});
