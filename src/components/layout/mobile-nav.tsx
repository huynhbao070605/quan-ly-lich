import { CalendarDays, CirclePlus, House, ListTodo, Menu } from "lucide-react";
import Link from "next/link";

const navigationItems = [
  { href: "/app/tong-quan", label: "Trang chủ", icon: House },
  { href: "/app/cong-viec", label: "Công việc", icon: ListTodo },
  { href: "/app/cong-viec/tao-moi", label: "+", icon: CirclePlus },
  { href: "/app/lich", label: "Lịch", icon: CalendarDays },
  { href: "/app/them", label: "Thêm", icon: Menu },
];

export function MobileNav() {
  return (
    <nav
      aria-label="Điều hướng di động"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {navigationItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex min-w-0 flex-col items-center justify-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950"
          >
            <Icon aria-hidden="true" className="size-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
