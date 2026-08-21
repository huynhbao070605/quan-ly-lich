import { cleanup, render, screen } from "@testing-library/react";
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
  startAt: "2026-08-21T00:00:00.000Z",
  dueAt: "2026-08-22T00:00:00.000Z",
  allDay: true,
  important: false,
  urgent: false,
  eisenhowerOverride: false,
  tagIds: ["00000000-0000-4000-8000-000000000003"],
};

describe("TaskDetailSheet", () => {
  afterEach(() => {
    cleanup();
  });

  test("submits controlled task edits through the update callback", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
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
    await user.clear(title);
    await user.type(title, "Hoàn thiện báo cáo");
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
      dueAt: task.dueAt,
      allDay: false,
      tagIds: task.tagIds,
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
        onUpdate={vi.fn()}
        open
        task={task}
      />,
    );

    await user.type(screen.getByLabelText("Thêm mục kiểm tra"), "  Kiểm tra số liệu  ");
    await user.click(screen.getByRole("button", { name: "Thêm mục" }));

    expect(onAddSubtask).toHaveBeenCalledWith(task.id, "Kiểm tra số liệu");
  });

  test("changes the reminder through its callback", async () => {
    const user = userEvent.setup();
    const onReminderChange = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailSheet
        onReminderChange={onReminderChange}
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        open
        task={task}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Nhắc việc"), "AT_START");

    expect(onReminderChange).toHaveBeenCalledWith(task.id, "AT_START");
  });

  test("changes recurrence through its callback", async () => {
    const user = userEvent.setup();
    const onRecurrenceChange = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailSheet
        onRecurrenceChange={onRecurrenceChange}
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        open
        task={task}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Lặp lại"), "WEEKLY");

    expect(onRecurrenceChange).toHaveBeenCalledWith(task.id, "WEEKLY");
  });

  test("sends manual Eisenhower changes through the dedicated callback", async () => {
    const user = userEvent.setup();
    const onEisenhowerChange = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailSheet
        onClose={vi.fn()}
        onEisenhowerChange={onEisenhowerChange}
        onUpdate={vi.fn()}
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
