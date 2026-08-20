import { Bell, Search } from "lucide-react";

type TopBarProps = {
  email: string;
};

export function TopBar({ email }: TopBarProps) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <label className="relative max-w-xl flex-1">
        <span className="sr-only">Tìm công việc</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          placeholder="Tìm công việc..."
          className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </label>
      <button
        type="button"
        aria-label="Thông báo"
        className="grid size-10 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-950"
      >
        <Bell aria-hidden="true" className="size-5" />
      </button>
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
