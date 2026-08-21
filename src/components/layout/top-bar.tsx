import { Bell } from "lucide-react";

import { GlobalSearch } from "@/components/search/global-search";

type TopBarProps = {
  email: string;
};

export function TopBar({ email }: TopBarProps) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <GlobalSearch />
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
