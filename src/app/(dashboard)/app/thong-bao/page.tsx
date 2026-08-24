import {
  clearReadNotifications,
  deleteNotification,
  listNotifications,
  markNotificationRead,
} from "@/actions/notification-actions";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function NotificationsPage() {
  const result = await listNotifications();
  const notifications = result.ok ? result.data : [];

  async function markRead(id: string) {
    "use server";

    await markNotificationRead(id);
  }

  async function remove(id: string) {
    "use server";

    await deleteNotification(id);
  }

  async function clearRead() {
    "use server";

    await clearReadNotifications();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Thông báo</h1>
        <p className="mt-2 text-sm text-slate-600">
          Theo dõi nhắc việc, công việc hôm nay và các mục quá hạn.
        </p>
      </header>
      <NotificationList
        notifications={notifications}
        onClearRead={clearRead}
        onDelete={remove}
        onMarkRead={markRead}
      />
    </div>
  );
}
