import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import HomePage from "./page";

test("hiển thị lối vào đăng nhập bằng tiếng Việt", () => {
  render(<HomePage />);

  expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
    "href",
    "/dang-nhap",
  );
});
