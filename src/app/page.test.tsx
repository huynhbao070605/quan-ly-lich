import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import HomePage from "./page";

test("renders an intentional auth loading gateway instead of a raw login placeholder", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { name: "Đang mở trang đăng nhập" })).toBeVisible();
  expect(screen.getByText("Chuẩn bị không gian làm việc cá nhân của bạn.")).toBeVisible();
  expect(screen.getByRole("link", { name: "Mở trang đăng nhập" })).toHaveAttribute(
    "href",
    "/dang-nhap",
  );
  expect(screen.queryByRole("link", { name: "Đăng nhập" })).not.toBeInTheDocument();
});
