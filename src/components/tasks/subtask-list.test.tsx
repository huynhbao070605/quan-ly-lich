import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { SubtaskList } from "./subtask-list";

const subtasks = [
  {
    id: "00000000-0000-4000-8000-000000000041",
    task_id: "00000000-0000-4000-8000-000000000010",
    title: "Kiểm tra số liệu",
    completed: false,
    position: 0,
    created_at: "2026-08-21T00:00:00.000Z",
    updated_at: "2026-08-21T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000042",
    task_id: "00000000-0000-4000-8000-000000000010",
    title: "Gửi bản nháp",
    completed: true,
    position: 1,
    created_at: "2026-08-21T00:00:00.000Z",
    updated_at: "2026-08-21T00:00:00.000Z",
  },
];

describe("SubtaskList", () => {
  test("adds, toggles, deletes, and reorders checklist items", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    const onReorder = vi.fn();

    render(
      <SubtaskList
        onAdd={onAdd}
        onDelete={onDelete}
        onReorder={onReorder}
        onToggle={onToggle}
        subtasks={subtasks}
        taskId={subtasks[0].task_id}
      />,
    );

    await user.type(screen.getByLabelText("Thêm mục kiểm tra"), "Đối chiếu");
    await user.click(screen.getByRole("button", { name: "Thêm mục" }));
    expect(onAdd).toHaveBeenCalledWith(subtasks[0].task_id, "Đối chiếu");

    await user.click(screen.getByRole("checkbox", { name: "Kiểm tra số liệu" }));
    expect(onToggle).toHaveBeenCalledWith(subtasks[0].id, true);

    await user.click(screen.getByRole("button", { name: "Xóa Kiểm tra số liệu" }));
    expect(onDelete).toHaveBeenCalledWith(subtasks[0].id);

    await user.click(screen.getByRole("button", { name: "Đưa Gửi bản nháp lên" }));
    expect(onReorder).toHaveBeenCalledWith(subtasks[0].task_id, [
      subtasks[1].id,
      subtasks[0].id,
    ]);
  });
});
