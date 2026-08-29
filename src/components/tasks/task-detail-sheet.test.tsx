import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { TaskDetailSheet } from "./task-detail-sheet";

const task = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Chuẩn bị báo cáo",
  description: "Bản nháp tuần này",
  status: "TODO" as const,
  priority: "MEDIUM" as const,
  projectId: "00000000-0000-4000-8000-000000000002",
  startAt: "2026-08-20T17:00:00.000Z",
  dueAt: "2026-08-22T02:30:00.000Z",
  allDay: false,
  important: false,
  urgent: false,
  eisenhowerOverride: false,
  tagIds: ["00000000-0000-4000-8000-000000000003"],
  reminderOffsets: [1440, 0],
};

describe("TaskDetailSheet", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("submits controlled task edits through the update callback", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(true);
    const { rerender } = render(
      <TaskDetailSheet
        onClose={vi.fn()}
        onUpdate={onUpdate}
        open
        projects={[{ id: task.projectId, name: "Công việc" }]}
        tags={[{ id: task.tagIds[0], name: "Gấp" }]}
        task={task}
      />,
    );

    const title = screen.getByLabelText("Tên công việc");
    fireEvent.change(title, { target: { value: "Hoàn thiện báo cáo" } });
    await user.selectOptions(screen.getByLabelText("Ưu tiên"), "HIGH");
    await user.click(screen.getByLabelText("Cả ngày"));
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(onUpdate).toHaveBeenCalledWith(task.id, {
      title: "Hoàn thiện báo cáo",
      description: "Bản nháp tuần này",
      status: "TODO",
      priority: "HIGH",
      projectId: task.projectId,
      startAt: task.startAt,
      dueAt: "2026-08-21T17:00:00.000Z",
      allDay: true,
      tagIds: task.tagIds,
      reminderOffsets: [1440, 0],
    });

    rerender(
      <TaskDetailSheet
        onClose={vi.fn()}
        onUpdate={onUpdate}
        open
        projects={[{ id: task.projectId, name: "Công việc" }]}
        tags={[{ id: task.tagIds[0], name: "Gấp" }]}
        task={task}
      />,
    );

    expect(screen.getByLabelText("Tên công việc")).toHaveValue("Hoàn thiện báo cáo");
  });

  test("shows and saves a timed deadline without UTC date drift", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(true);

    render(<TaskDetailSheet onClose={vi.fn()} onUpdate={onUpdate} open task={task} />);

    expect(screen.getByLabelText("Hạn chót")).toHaveValue("2026-08-22");
    expect(screen.getByLabelText("Giờ hạn chót")).toHaveValue("09:30");

    fireEvent.change(screen.getByLabelText("Giờ hạn chót"), {
      target: { value: "10:45" },
    });
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(onUpdate).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({
        allDay: false,
        dueAt: "2026-08-22T03:45:00.000Z",
      }),
    );
  });

  test("saves multiple reminder offsets with the task update", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(true);

    render(<TaskDetailSheet onClose={vi.fn()} onUpdate={onUpdate} open task={task} />);

    await user.click(screen.getByLabelText("Đúng hạn"));
    await user.click(screen.getByLabelText("1 giờ trước"));
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(onUpdate).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({
        reminderOffsets: [1440, 60],
      }),
    );
  });

  test("labels the dialog, focuses the title, and closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<TaskDetailSheet onClose={onClose} onUpdate={vi.fn()} open task={task} />);

    expect(screen.getByRole("dialog", { name: "Chi tiết công việc" })).toBeVisible();
    expect(screen.getByLabelText("Tên công việc")).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("adds a checklist item through the subtask callback", async () => {
    const user = userEvent.setup();
    const onAddSubtask = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailSheet
        onAddSubtask={onAddSubtask}
        onClose={vi.fn()}
        onUpdate={vi.fn().mockResolvedValue(true)}
        open
        task={task}
      />,
    );

    await user.type(screen.getByLabelText("Thêm mục kiểm tra"), "  Kiểm tra số liệu  ");
    await user.click(screen.getByRole("button", { name: "Thêm mục" }));

    expect(onAddSubtask).toHaveBeenCalledWith(task.id, "Kiểm tra số liệu");
  });

  test("saves recurrence changes through its callback after the task update succeeds", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(true);
    const onRecurrenceChange = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailSheet
        onClose={vi.fn()}
        onRecurrenceChange={onRecurrenceChange}
        onUpdate={onUpdate}
        open
        task={{ ...task, startAt: null }}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Lặp lại"), "MONTHLY");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(onRecurrenceChange).toHaveBeenCalledWith(task.id, {
      frequency: "MONTHLY",
      interval: 1,
      monthDay: 22,
    });
  });

  test("saves turning recurrence off as an explicit null rule", async () => {
    const user = userEvent.setup();
    const onRecurrenceChange = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailSheet
        onClose={vi.fn()}
        onRecurrenceChange={onRecurrenceChange}
        onUpdate={vi.fn().mockResolvedValue(true)}
        open
        recurrence={{
          frequency: "WEEKLY",
          interval: 1,
          weekdays: [2],
        }}
        task={{
          ...task,
          recurrenceSeriesId: "00000000-0000-4000-8000-000000000099",
          occurrenceStartAt: task.startAt,
        }}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Lặp lại"), "NONE");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(onRecurrenceChange).toHaveBeenCalledWith(task.id, null);
  });

  test("sends manual Eisenhower changes through the dedicated callback", async () => {
    const user = userEvent.setup();
    const onEisenhowerChange = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailSheet
        onClose={vi.fn()}
        onEisenhowerChange={onEisenhowerChange}
        onUpdate={vi.fn().mockResolvedValue(true)}
        open
        task={task}
      />,
    );

    await user.click(screen.getByLabelText("Quan trọng"));
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(onEisenhowerChange).toHaveBeenCalledWith(task.id, {
      important: true,
      urgent: false,
      manual: true,
    });
  });

  test("deletes the task from the detail workflow after confirmation", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <TaskDetailSheet
        onClose={vi.fn()}
        onDelete={onDelete}
        onUpdate={vi.fn()}
        open
        task={task}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Xóa công việc" }));

    expect(onDelete).toHaveBeenCalledWith(task.id);
  });
});
