import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { NotificationList } from "./notification-list";
import type { NotificationRecord } from "@/actions/notification-actions";

const notifications: NotificationRecord[] = [
  {
    createdAt: "2026-08-24T02:00:00.000Z",
    id: "today",
    message: "Bạn có 3 công việc đến hạn hôm nay.",
    readAt: null,
    taskDeleted: false,
    taskId: "task-1",
    title: "Công việc hôm nay",
    type: "DUE_TODAY",
  },
  {
    createdAt: "2026-08-23T02:00:00.000Z",
    id: "yesterday",
    message: "Đã quá hạn: Nộp báo cáo",
    readAt: "2026-08-23T03:00:00.000Z",
    taskDeleted: false,
    taskId: "task-2",
    title: "Công việc quá hạn",
    type: "OVERDUE",
  },
  {
    createdAt: "2026-08-20T02:00:00.000Z",
    id: "older",
    message: "Task removed",
    readAt: null,
    taskDeleted: true,
    taskId: "task-3",
    title: "Nhắc việc",
    type: "REMINDER",
  },
];

describe("NotificationList", () => {
  test("groups notifications and filters unread items", async () => {
    const user = userEvent.setup();

    render(
      <NotificationList
        notifications={notifications}
        now={new Date("2026-08-24T10:00:00.000Z")}
        onClearRead={vi.fn()}
        onDelete={vi.fn()}
        onMarkRead={vi.fn()}
      />,
    );

    expect(screen.getByText("Hôm nay")).toBeVisible();
    expect(screen.getByText("Hôm qua")).toBeVisible();
    expect(screen.getByText("Trước đó")).toBeVisible();
    expect(screen.getByText("Công việc này không còn tồn tại.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Chưa đọc" }));

    expect(screen.getByText("Công việc hôm nay")).toBeVisible();
    expect(screen.queryByText("Công việc quá hạn")).not.toBeInTheDocument();
  });
});
