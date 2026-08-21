import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addSubtask: vi.fn(),
  createTag: vi.fn(),
  createTask: vi.fn(),
  deleteSubtask: vi.fn(),
  deleteTask: vi.fn(),
  overrideEisenhower: vi.fn(),
  refresh: vi.fn(),
  reorderSubtasks: vi.fn(),
  resetEisenhower: vi.fn(),
  toggleSubtask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/actions/task-actions", () => ({
  createTask: mocks.createTask,
  deleteTask: mocks.deleteTask,
  updateTask: mocks.updateTask,
}));
vi.mock("@/actions/tag-actions", () => ({ createTag: mocks.createTag }));
vi.mock("@/actions/subtask-actions", () => ({
  addSubtask: mocks.addSubtask,
  deleteSubtask: mocks.deleteSubtask,
  reorderSubtasks: mocks.reorderSubtasks,
  toggleSubtask: mocks.toggleSubtask,
}));
vi.mock("@/actions/eisenhower-actions", () => ({
  overrideEisenhower: mocks.overrideEisenhower,
  resetEisenhower: mocks.resetEisenhower,
}));

import { TasksWorkspace, type TasksWorkspaceTask } from "./tasks-workspace";

const task: TasksWorkspaceTask = {
  id: "00000000-0000-4000-8000-000000000010",
  title: "Nộp báo cáo",
  description: "Bản tổng hợp",
  status: "TODO",
  priority: "MEDIUM",
  projectId: null,
  project: null,
  startAt: null,
  dueAt: null,
  allDay: true,
  important: false,
  urgent: false,
  eisenhowerOverride: false,
  tagIds: [],
  tags: [],
  subtasks: [],
};

describe("TasksWorkspace", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    const success = { ok: true, data: task };
    mocks.createTask.mockResolvedValue(success);
    mocks.updateTask.mockResolvedValue(success);
    mocks.deleteTask.mockResolvedValue({ ok: true, data: null });
    mocks.createTag.mockResolvedValue({ ok: true, data: { id: "tag-new" } });
    mocks.addSubtask.mockResolvedValue(success);
    mocks.deleteSubtask.mockResolvedValue({ ok: true, data: null });
    mocks.reorderSubtasks.mockResolvedValue(success);
    mocks.toggleSubtask.mockResolvedValue(success);
    mocks.overrideEisenhower.mockResolvedValue(success);
    mocks.resetEisenhower.mockResolvedValue(success);
  });

  test("opens task detail from a taskId deep link and saves through updateTask", async () => {
    const user = userEvent.setup();
    render(
      <TasksWorkspace
        initialTaskId={task.id}
        projects={[]}
        tags={[]}
        tasks={[task]}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Chi tiết công việc" })).toBeVisible();
    const title = screen.getByLabelText("Tên công việc");
    await user.clear(title);
    await user.type(title, "Nộp báo cáo quý");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(mocks.updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ title: "Nộp báo cáo quý", tagIds: [] }),
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  test("connects the new-task and new-tag controls to server actions", async () => {
    const user = userEvent.setup();
    render(
      <TasksWorkspace initialTaskId={null} projects={[]} tags={[]} tasks={[task]} />,
    );

    await user.click(screen.getByRole("button", { name: "Công việc mới" }));
    await user.type(screen.getByLabelText("Tên công việc"), "Gọi khách hàng");
    await user.click(screen.getByRole("button", { name: "Tạo công việc" }));
    expect(mocks.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Gọi khách hàng" }),
    );

    await user.click(screen.getByRole("button", { name: "Thẻ mới" }));
    await user.type(screen.getByLabelText("Tên thẻ"), "Gấp");
    await user.click(screen.getByRole("button", { name: "Tạo thẻ" }));
    expect(mocks.createTag).toHaveBeenCalledWith({ name: "Gấp" });
  });

  test("connects checklist and delete controls to their server actions", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <TasksWorkspace
        initialTaskId={task.id}
        projects={[]}
        tags={[]}
        tasks={[task]}
      />,
    );

    await user.type(screen.getByLabelText("Thêm mục kiểm tra"), "Kiểm tra số liệu");
    await user.click(screen.getByRole("button", { name: "Thêm mục" }));
    expect(mocks.addSubtask).toHaveBeenCalledWith(task.id, "Kiểm tra số liệu");

    await user.click(screen.getByRole("button", { name: "Xóa công việc" }));
    expect(mocks.deleteTask).toHaveBeenCalledWith(task.id);
  });
});
