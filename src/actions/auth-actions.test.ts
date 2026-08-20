import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "./auth-actions";

const appUrl = "https://app.example.vn";
const callbackUrl = `${appUrl}/auth/callback`;

function createAuthClient(overrides = {}) {
  return {
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth" },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

function formData(values: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}

describe("authentication server actions", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = appUrl;
    vi.clearAllMocks();
  });

  test("sends a sign-up payload with the canonical email callback URL", async () => {
    const auth = createAuthClient();
    mocks.createServerClient.mockResolvedValue({ auth });

    const result = await signUpWithEmail(
      formData({
        displayName: "An",
        email: "an@example.com",
        password: "12345678",
      }),
    );

    expect(result).toEqual({
      ok: true,
      message: "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.",
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "an@example.com",
      password: "12345678",
      options: {
        data: { full_name: "An" },
        emailRedirectTo: callbackUrl,
      },
    });
  });

  test("rejects an invalid email sign-in without calling Supabase", async () => {
    const result = await signInWithEmail(
      formData({ email: "sai", password: "12345678" }),
    );

    expect(result).toEqual({
      ok: false,
      message: "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("returns a Vietnamese error when email sign-in is rejected", async () => {
    const auth = createAuthClient({
      signInWithPassword: vi.fn().mockResolvedValue({ error: new Error("invalid") }),
    });
    mocks.createServerClient.mockResolvedValue({ auth });

    const result = await signInWithEmail(
      formData({ email: "an@example.com", password: "12345678" }),
    );

    expect(result).toEqual({
      ok: false,
      message: "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "an@example.com",
      password: "12345678",
    });
  });

  test("starts Google OAuth with the canonical callback URL", async () => {
    const auth = createAuthClient();
    mocks.createServerClient.mockResolvedValue({ auth });

    await expect(signInWithGoogle()).rejects.toThrow(
      "redirect:https://accounts.google.com/o/oauth2/auth",
    );
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  });

  test("rejects an invalid password reset email without calling Supabase", async () => {
    const result = await requestPasswordReset(formData({ email: "sai" }));

    expect(result).toEqual({
      ok: false,
      message: "Vui lòng nhập địa chỉ email hợp lệ.",
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("sends password reset links through the canonical callback URL", async () => {
    const auth = createAuthClient();
    mocks.createServerClient.mockResolvedValue({ auth });

    const result = await requestPasswordReset(formData({ email: "an@example.com" }));

    expect(result).toEqual({
      ok: true,
      message: "Email đặt lại mật khẩu đã được gửi.",
    });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("an@example.com", {
      redirectTo: callbackUrl,
    });
  });
});
