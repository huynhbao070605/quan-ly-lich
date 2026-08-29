"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "@/actions/notification-actions";

type NotificationPopoverProps = {
  initialNotifications: NotificationRecord[];
};

export function NotificationPopover({
  initialNotifications,
}: NotificationPopoverProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((notification) => notification.readAt === null).length;

  async function markAllRead() {
    const result = await markAllNotificationsRead();

    if (result.ok) {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? readAt,
        })),
      );
    }
  }

  async function markOneRead(id: string) {
    const result = await markNotificationRead(id);

    if (result.ok) {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, readAt } : notification,
        ),
      );
    }
  }

  return (
    <details className="relative shrink-0">
      <summary
        aria-label="Thông báo"
        className="relative grid size-10 cursor-pointer place-items-center rounded-md text-slate-700 marker:content-none hover:bg-slate-100 hover:text-slate-950"
      >
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 min-w-5 rounded-full bg-rose-600 px-1 text-center text-xs font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </summary>
      <div className="absolute right-0 top-12 z-30 w-80 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <p className="text-sm font-semibold text-slate-950">Thông báo</p>
          <button
            className="text-xs font-medium text-teal-700 hover:text-teal-800"
            onClick={() => void markAllRead()}
            type="button"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {notifications.slice(0, 5).map((notification) => (
            <li className="border-b border-slate-100 px-3 py-2" key={notification.id}>
              <button
                className="block w-full text-left"
                onClick={() => void markOneRead(notification.id)}
                type="button"
              >
                <span className="block truncate text-sm font-medium text-slate-900">
                  {notification.title}
                </span>
                <span className="mt-1 block line-clamp-2 text-xs text-slate-600">
                  {notification.taskDeleted
                    ? "Công việc này không còn tồn tại."
                    : notification.message}
                </span>
              </button>
            </li>
          ))}
          {notifications.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-600">Không có thông báo.</li>
          ) : null}
        </ul>
        <Link
          className="block px-3 py-2 text-center text-sm font-medium text-teal-700 hover:bg-slate-50"
          href="/app/thong-bao"
        >
          Xem tất cả
        </Link>
      </div>
    </details>
  );
}
