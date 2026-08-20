import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { AppSidebar } from "./app-sidebar";

describe("AppSidebar", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders every required desktop navigation link", () => {
    render(<AppSidebar />);

    expect(screen.getByRole("link", { name: "Tổng quan" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Công việc" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Lịch" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Kanban" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ma trận Eisenhower" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Kế hoạch hôm nay" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Kế hoạch tuần" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Dự án" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Cài đặt" })).toBeVisible();
  });
});
