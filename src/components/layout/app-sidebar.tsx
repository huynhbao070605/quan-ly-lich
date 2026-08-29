import {
  CalendarDays,
  CalendarRange,
  Columns3,
  FolderKanban,
  Grid2X2,
  LayoutDashboard,
  ListTodo,
  Settings,
  Sun,
} from "lucide-react";
import Link from "next/link";

const navigationItems = [
  { href: "/app/tong-quan", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/app/cong-viec", label: "Công việc", icon: ListTodo },
  { href: "/app/lich", label: "Lịch", icon: CalendarDays },
  { href: "/app/kanban", label: "Kanban", icon: Columns3 },
  { href: "/app/eisenhower", label: "Ma trận Eisenhower", icon: Grid2X2 },
  { href: "/app/ke-hoach-ngay", label: "Kế hoạch hôm nay", icon: Sun },
  { href: "/app/ke-hoach-tuan", label: "Kế hoạch tuần", icon: CalendarRange },
  { href: "/app/du-an", label: "Dự án", icon: FolderKanban },
  { href: "/app/cai-dat", label: "Cài đặt", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-6 py-5">
        <Link href="/app/tong-quan" className="text-lg font-semibold text-slate-950">
          Quản lý lịch
        </Link>
      </div>
      <nav aria-label="Điều hướng chính" className="flex-1 space-y-1 p-3">
        {navigationItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
          >
            <Icon aria-hidden="true" className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
