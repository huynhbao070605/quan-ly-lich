import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { TaskList } from "./task-list";

const tasks = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    title: "Nộp báo cáo",
    description: "Hoàn thiện bản tổng hợp",
    status: "IN_PROGRESS" as const,
    priority: "HIGH" as const,
    dueAt: "2026-08-21T10:00:00.000Z",
    project: { id: "project-1", name: "Công việc" },
    tags: [
      { id: "tag-1", name: "Gấp" },
      { id: "tag-2", name: "Sâu" },
      { id: "tag-3", name: "Nhà" },
    ],
  },
];

describe("TaskList", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders task title, Vietnamese status and priority, due date, project and max two tags", () => {
    render(<TaskList tasks={tasks} />);

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
    render(<TaskList tasks={[]} />);

    expect(screen.getByRole("tab", { name: "Tất cả" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Hôm nay" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Sắp tới" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Quá hạn" })).toBeVisible();
    expect(screen.getByText("Chưa có công việc")).toBeVisible();
    expect(screen.getByText("Tạo công việc đầu tiên để bắt đầu.")).toBeVisible();
  });
});
