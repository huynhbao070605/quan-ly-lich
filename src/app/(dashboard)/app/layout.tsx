import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import { requireUser } from "@/lib/auth/require-user";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <TopBar email={user.email ?? ""} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
