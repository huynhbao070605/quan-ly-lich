import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";

describe("shared states", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders the required empty task copy", () => {
    render(
      <EmptyState
        description="Hôm nay bạn không có việc cần xử lý."
        title="Chưa có công việc"
      />,
    );

    expect(screen.getByText("Chưa có công việc")).toBeVisible();
    expect(screen.getByText("Hôm nay bạn không có việc cần xử lý.")).toBeVisible();
  });

  test("renders the required error copy and retry action", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();

    render(<ErrorState onRetry={reset} />);

    expect(
      screen.getByText("Không thể tải dữ liệu. Vui lòng thử lại."),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(reset).toHaveBeenCalled();
  });
});
