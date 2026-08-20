import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUpWithEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

vi.mock("@/actions/auth-actions", () => mocks);

import { AuthCard } from "./auth-card";

describe("AuthCard", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("renders the Vietnamese login form controls", () => {
    render(<AuthCard mode="login" />);

    expect(
      screen.getByRole("button", { name: "Tiếp tục với Google" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Mật khẩu")).toBeVisible();
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeVisible();
  });

  test("renders the returned Vietnamese sign-in feedback", async () => {
    mocks.signInWithEmail.mockResolvedValue({
      ok: false,
      message: "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
    });
    const user = userEvent.setup();

    render(<AuthCard mode="login" />);
    await user.type(screen.getByLabelText("Email"), "an@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), "12345678");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.");
  });
});
