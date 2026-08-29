import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import Loading from "@/app/(dashboard)/app/cong-viec/loading";

import { TaskList, type TaskListItem } from "./task-list";
import { TaskViews } from "./task-views";

const now = new Date("2026-08-21T05:00:00.000Z");

const tasks: TaskListItem[] = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    title: "Nộp báo cáo",
    description: "Hoàn thiện bản tổng hợp",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueAt: "2026-08-21T10:00:00.000Z",
    project: { id: "project-1", name: "Công việc" },
    tags: [
      { id: "tag-1", name: "Gấp" },
      { id: "tag-2", name: "Sâu" },
      { id: "tag-3", name: "Nhà" },
    ],
  },
];

const filterTasks: TaskListItem[] = [
  {
    id: "00000000-0000-4000-8000-000000000011",
    title: "Chuẩn bị họp hôm nay",
    status: "TODO",
    priority: "MEDIUM",
    dueAt: "2026-08-21T08:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    title: "Gửi kế hoạch tuần tới",
    status: "TODO",
    priority: "LOW",
    dueAt: "2026-08-23T02:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000013",
    title: "Chốt công việc quá hạn",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000014",
    title: "Việc đã hoàn tất hôm qua",
    status: "DONE",
    priority: "HIGH",
    dueAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000015",
    title: "Việc đã hủy hôm qua",
    status: "CANCELLED",
    priority: "HIGH",
    dueAt: "2026-08-20T09:00:00.000Z",
  },
];

describe("TaskList", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders task title, Vietnamese status and priority, due date, project and max two tags", () => {
    render(<TaskList tasks={tasks} now={now} />);

    const item = screen.getByRole("article", { name: "Nộp báo cáo" });

    expect(within(item).getByText("Nộp báo cáo")).toBeVisible();
    expect(within(item).getByText("Đang thực hiện")).toBeVisible();
    expect(within(item).getByText("Cao")).toBeVisible();
    expect(within(item).getByText("21/08/2026")).toBeVisible();
    expect(within(item).getByText("Công việc")).toBeVisible();
    expect(within(item).getByText("Gấp")).toBeVisible();
    expect(within(item).getByText("Sâu")).toBeVisible();
    expect(within(item).queryByText("Nhà")).not.toBeInTheDocument();
  });

  test("renders quick tabs and the empty state", () => {
    render(<TaskList tasks={[]} now={now} />);

    expect(screen.getByRole("tab", { name: "Tất cả" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Hôm nay" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Sắp tới" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Quá hạn" })).toBeVisible();
    expect(screen.getByText("Chưa có công việc")).toBeVisible();
    expect(screen.getByText("Tạo công việc đầu tiên để bắt đầu.")).toBeVisible();
  });

  test("filters quick tabs for today, upcoming and overdue tasks", async () => {
    const user = userEvent.setup();

    render(<TaskList tasks={filterTasks} now={now} />);

    await user.click(screen.getByRole("tab", { name: "Quá hạn" }));

    expect(screen.getByRole("tab", { name: "Quá hạn" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("article", { name: "Chốt công việc quá hạn" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "Việc đã hoàn tất hôm qua" })).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Việc đã hủy hôm qua" })).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Gửi kế hoạch tuần tới" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Hôm nay" }));

    expect(screen.getByRole("tab", { name: "Hôm nay" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("article", { name: "Chuẩn bị họp hôm nay" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "Chốt công việc quá hạn" })).not.toBeInTheDocument();
  });
});

describe("TaskViews", () => {
  afterEach(() => {
    cleanup();
  });

  test("switches between list and table without rendering both views at once", async () => {
    const user = userEvent.setup();

    render(<TaskViews tasks={tasks} now={now} />);

    expect(screen.getByRole("button", { name: "Danh sách" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("article", { name: "Nộp báo cáo" })).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bảng" }));

    expect(screen.getByRole("button", { name: "Bảng" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.queryByRole("article", { name: "Nộp báo cáo" })).not.toBeInTheDocument();
  });

  test("opens the selected task from both list and table views", async () => {
    const user = userEvent.setup();
    const onSelectTask = vi.fn();

    render(<TaskViews onSelectTask={onSelectTask} tasks={tasks} now={now} />);

    await user.click(screen.getByRole("button", { name: "Nộp báo cáo" }));
    expect(onSelectTask).toHaveBeenLastCalledWith(tasks[0].id);

    await user.click(screen.getByRole("button", { name: "Bảng" }));
    await user.click(screen.getByRole("button", { name: "Nộp báo cáo" }));
    expect(onSelectTask).toHaveBeenLastCalledWith(tasks[0].id);
  });
});

describe("TasksPage loading", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders a Vietnamese loading state", () => {
    render(<Loading />);

    expect(screen.getByText("Đang tải công việc...")).toBeVisible();
  });
});
