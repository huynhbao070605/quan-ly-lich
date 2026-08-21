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
      important: false,
      urgent: false,
      eisenhowerOverride: false,
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
});
