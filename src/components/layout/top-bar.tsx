import { listNotifications } from "@/actions/notification-actions";
import { NotificationPopover } from "@/components/notifications/notification-popover";
import { GlobalSearch } from "@/components/search/global-search";

type TopBarProps = {
  email: string;
};

export async function TopBar({ email }: TopBarProps) {
  const initial = email.charAt(0).toUpperCase();
  const notifications = await listNotifications();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <GlobalSearch />
      <NotificationPopover initialNotifications={notifications.ok ? notifications.data : []} />
      <details className="relative shrink-0">
        <summary className="grid size-10 cursor-pointer place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white marker:content-none hover:bg-emerald-800">
          <span className="sr-only">Mở menu tài khoản</span>
          {initial}
        </summary>
        <div className="absolute right-0 top-12 w-56 rounded-md border border-slate-200 bg-white p-3 text-sm shadow-lg">
          <p className="truncate font-medium text-slate-900">{email}</p>
        </div>
      </details>
    </header>
  );
}
