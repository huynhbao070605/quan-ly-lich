import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description?: string;
  title?: string;
};

export function EmptyState({
  action,
  description = "Hôm nay bạn không có việc cần xử lý.",
  title = "Chưa có công việc",
}: EmptyStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <Inbox aria-hidden="true" className="size-10 text-slate-400" />
      <h2 className="mt-4 text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
