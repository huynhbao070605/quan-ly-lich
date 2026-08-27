import userEvent from "@testing-library/user-event";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  test("renders a clear email confirmation state after sign-up without a session", async () => {
    mocks.signUpWithEmail.mockResolvedValue({
      ok: true,
      status: "emailConfirmationRequired",
      message: "Kiểm tra email của bạn. Chúng tôi đã gửi liên kết xác nhận đến email bạn vừa đăng ký.",
    });

    render(<AuthCard mode="signup" />);
    fireEvent.change(screen.getByLabelText("Họ và tên"), { target: { value: "An" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "an@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    expect(
      await screen.findByRole("heading", { name: "Kiểm tra email của bạn" }),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Chúng tôi đã gửi liên kết xác nhận đến email bạn vừa đăng ký.",
    );
  });
});
