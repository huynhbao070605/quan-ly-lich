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
    expect(screen.getByLabelText("Hạn chót")).toBeVisible();
    expect(screen.queryByLabelText("Ngày bắt đầu")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ưu tiên")).toBeVisible();
    expect(screen.getByLabelText("Dự án")).toBeVisible();
    expect(screen.getByRole("button", { name: "Thêm tùy chọn" })).toBeVisible();
    expect(screen.queryByLabelText("Lặp lại")).not.toBeInTheDocument();
  });

  test("reveals advanced fields and reminder controls after expanding options", async () => {
    const user = userEvent.setup();
    render(<QuickAddTask onCreate={vi.fn()} initialReminderOffsets={[1440, 0]} />);

    await user.click(screen.getByRole("button", { name: "Thêm tùy chọn" }));

    expect(screen.getByLabelText("Mô tả")).toBeVisible();
    expect(screen.getByLabelText("Lặp lại")).toBeEnabled();
    expect(screen.getByRole("option", { name: "Không lặp" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Hằng ngày" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Hằng tuần" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Hằng tháng" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Hằng năm" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Nhắc việc" })).toBeVisible();
    expect(screen.getByLabelText("1 ngày trước")).toBeChecked();
    expect(screen.getByLabelText("Đúng hạn")).toBeChecked();
  });

  test("submits weekly recurrence with multiple weekdays and preserves reminders", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<QuickAddTask onCreate={onCreate} initialReminderOffsets={[1440]} />);

    fireEvent.change(screen.getByLabelText("Tên công việc"), {
      target: { value: "Tập thể thao" },
    });
    fireEvent.change(screen.getByLabelText("Hạn chót"), {
      target: { value: "2026-08-24" },
    });
    await user.click(screen.getByRole("button", { name: "Thêm tùy chọn" }));
    await user.selectOptions(screen.getByLabelText("Lặp lại"), "WEEKLY");
    await user.click(screen.getByRole("button", { name: "T2" }));
    await user.click(screen.getByRole("button", { name: "T4" }));
    await user.click(screen.getByRole("button", { name: "T6" }));
    await user.click(screen.getByLabelText("1 giờ trước"));
    await user.click(screen.getByRole("button", { name: "Tạo công việc" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Tập thể thao",
        dueAt: "2026-08-23T17:00:00.000Z",
        reminderOffsets: [1440, 60],
      }),
      {
        frequency: "WEEKLY",
        interval: 1,
        weekdays: [1, 3, 5],
      },
    );
  });

  test("submits a timed deadline using Asia Ho Chi Minh semantics", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<QuickAddTask onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText("Tên công việc"), {
      target: { value: "Tập thể thao" },
    });
    fireEvent.change(screen.getByLabelText("Hạn chót"), {
      target: { value: "2026-08-26" },
    });
    await user.click(screen.getByRole("button", { name: "Thêm tùy chọn" }));
    await user.click(screen.getByLabelText("Cả ngày"));
    await user.clear(screen.getByLabelText("Giờ hạn chót"));
    await user.type(screen.getByLabelText("Giờ hạn chót"), "09:30");
    await user.click(screen.getByRole("button", { name: "Tạo công việc" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Tập thể thao",
        allDay: false,
        dueAt: "2026-08-26T02:30:00.000Z",
      }),
    );
  });

  test("submits selected reminder offsets with the new task", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<QuickAddTask onCreate={onCreate} initialReminderOffsets={[1440]} />);

    fireEvent.change(screen.getByLabelText("Tên công việc"), {
      target: { value: "Nộp báo cáo" },
    });
    fireEvent.change(screen.getByLabelText("Hạn chót"), {
      target: { value: "2026-08-26" },
    });
    await user.click(screen.getByRole("button", { name: "Thêm tùy chọn" }));
    await user.click(screen.getByLabelText("1 giờ trước"));
    await user.click(screen.getByLabelText("1 ngày trước"));
    await user.click(screen.getByRole("button", { name: "Tạo công việc" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        reminderOffsets: [60],
      }),
    );
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
    expect(screen.getByLabelText("Hạn chót")).toHaveFocus();

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
