"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { NotificationRecord } from "@/actions/notification-actions";

type NotificationListProps = {
  notifications: NotificationRecord[];
  now?: Date;
  onClearRead: () => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onMarkRead: (id: string) => Promise<void> | void;
};

type NotificationGroup = {
  label: "Hôm nay" | "Hôm qua" | "Trước đó";
  notifications: NotificationRecord[];
};

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function groupNotifications(
  notifications: NotificationRecord[],
  now: Date,
): NotificationGroup[] {
  const today = dayKey(now);
  const yesterday = dayKey(addDays(now, -1));
  const groups: NotificationGroup[] = [
    { label: "Hôm nay", notifications: [] },
    { label: "Hôm qua", notifications: [] },
    { label: "Trước đó", notifications: [] },
  ];

  for (const notification of notifications) {
    const key = dayKey(new Date(notification.createdAt));

    if (key === today) {
      groups[0].notifications.push(notification);
    } else if (key === yesterday) {
      groups[1].notifications.push(notification);
    } else {
      groups[2].notifications.push(notification);
    }
  }

  return groups.filter((group) => group.notifications.length > 0);
}

export function NotificationList({
  notifications,
  now = new Date(),
  onClearRead,
  onDelete,
  onMarkRead,
}: NotificationListProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const visibleNotifications = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((notification) => notification.readAt === null)
        : notifications,
    [filter, notifications],
  );
  const groups = groupNotifications(visibleNotifications, now);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-pressed={filter === "all"}
          className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 aria-pressed:text-teal-700"
          onClick={() => setFilter("all")}
          type="button"
        >
          Tất cả
        </button>
        <button
          aria-pressed={filter === "unread"}
          className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 aria-pressed:border-teal-600 aria-pressed:bg-teal-50 aria-pressed:text-teal-700"
          onClick={() => setFilter("unread")}
          type="button"
        >
          Chưa đọc
        </button>
        <button
          className="ml-auto h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => void onClearRead()}
          type="button"
        >
          Xóa thông báo đã đọc
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Không có thông báo.
        </p>
      ) : null}

      {groups.map((group) => (
        <section className="space-y-2" key={group.label}>
          <h2 className="text-sm font-semibold text-slate-700">{group.label}</h2>
          <ul className="space-y-2">
            {group.notifications.map((notification) => (
              <li
                className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                key={notification.id}
              >
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    {notification.taskDeleted ? (
                      <p className="mt-2 text-sm text-rose-700">
                        Công việc này không còn tồn tại.
                      </p>
                    ) : null}
                    {notification.taskId && !notification.taskDeleted ? (
                      <Link
                        className="mt-2 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
                        href={`/app/cong-viec?taskId=${notification.taskId}`}
                      >
                        Mở công việc
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {notification.readAt === null ? (
                      <button
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => void onMarkRead(notification.id)}
                        type="button"
                      >
                        Đánh dấu đã đọc
                      </button>
                    ) : null}
                    <button
                      className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      onClick={() => void onDelete(notification.id)}
                      type="button"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
