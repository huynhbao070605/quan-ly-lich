import { AlertTriangle, CheckCircle2, Clock3, ListTodo } from "lucide-react";

import type { DashboardSummary } from "@/lib/dashboard/queries";

type SummaryCardsProps = {
  summary: Pick<
    DashboardSummary,
    "completionPercentage" | "inProgressCount" | "overdueCount" | "todayCount"
  >;
};

const cardStyles = [
  {
    key: "today",
    label: "Công việc hôm nay",
    icon: ListTodo,
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },
  {
    key: "inProgress",
    label: "Đang thực hiện",
    icon: Clock3,
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    key: "overdue",
    label: "Quá hạn",
    icon: AlertTriangle,
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    key: "completion",
    label: "Hoàn thành",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
] as const;

export function SummaryCards({ summary }: SummaryCardsProps) {
  const values = {
    today: summary.todayCount.toString(),
    inProgress: summary.inProgressCount.toString(),
    overdue: summary.overdueCount.toString(),
    completion: `${summary.completionPercentage}%`,
  };

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cardStyles.map((card) => {
        const Icon = card.icon;

        return (
          <article
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            key={card.key}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {values[card.key]}
                </p>
              </div>
              <span
                className={`inline-flex size-10 items-center justify-center rounded-md border ${card.className}`}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
