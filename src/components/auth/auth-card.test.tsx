import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { AuthCard } from "./auth-card";

describe("AuthCard", () => {
  test("renders the Vietnamese login form controls", () => {
    render(<AuthCard mode="login" />);

    expect(
      screen.getByRole("button", { name: "Tiếp tục với Google" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Mật khẩu")).toBeVisible();
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeVisible();
  });
});
