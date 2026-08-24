import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { QuickAddTask } from "./quick-add-task";

describe("QuickAddTask", () => {
  afterEach(() => {
    cleanup();
  });

  test("shows the compact fields before advanced options are expanded", () => {
    render(<QuickAddTask onCreate={vi.fn()} />);

    expect(screen.getByLabelText("Tên công việc")).toBeVisible();
    expect(screen.getByLabelText("Ngày")).toBeVisible();
    expect(screen.getByLabelText("Ưu tiên")).toBeVisible();
    expect(screen.getByLabelText("Dự án")).toBeVisible();
    expect(screen.getByRole("button", { name: "Thêm tùy chọn" })).toBeVisible();
    expect(screen.queryByLabelText("Lặp lại")).not.toBeInTheDocument();
  });

  test("reveals advanced fields after expanding options", async () => {
    const user = userEvent.setup();
    render(<QuickAddTask onCreate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Thêm tùy chọn" }));

    expect(screen.getByLabelText("Mô tả")).toBeVisible();
    expect(screen.getByLabelText("Lặp lại")).toBeDisabled();
    expect(screen.queryByRole("option", { name: "Hằng ngày" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Hằng tuần" })).not.toBeInTheDocument();
  });

  test("submits the title with default priority on Enter outside IME composition", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<QuickAddTask onCreate={onCreate} />);

    await user.type(screen.getByLabelText("Tên công việc"), "Nộp báo cáo{Enter}");

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Nộp báo cáo",
        priority: "MEDIUM",
      }),
    );
  });

  test("does not submit Enter while IME composition is active", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<QuickAddTask onCreate={onCreate} />);
    const titleInput = screen.getByLabelText("Tên công việc");

    await user.type(titleInput, "Nhập bằng IME");
    fireEvent.compositionStart(titleInput);
    fireEvent.keyDown(titleInput, { key: "Enter" });

    expect(onCreate).not.toHaveBeenCalled();

    fireEvent.compositionEnd(titleInput);
    fireEvent.keyDown(titleInput, { key: "Enter" });

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  test("has a predictable keyboard tab order through compact fields", async () => {
    const user = userEvent.setup();
    render(<QuickAddTask onCreate={vi.fn()} projects={[{ id: "project-1", name: "Dự án" }]} />);

    await user.tab();
    expect(screen.getByLabelText("Tên công việc")).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText("Ngày")).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText("Ưu tiên")).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText("Dự án")).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Thêm tùy chọn" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Tạo công việc" })).toHaveFocus();
  });
});
