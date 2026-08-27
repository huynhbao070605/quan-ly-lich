"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { DashboardStatusBreakdownItem } from "@/lib/dashboard/queries";
import { getStatusPresentation } from "@/lib/domain/task-display";

type StatusDistributionChartProps = {
  items: DashboardStatusBreakdownItem[];
};

export function StatusDistributionChart({ items }: StatusDistributionChartProps) {
  const data = items.map((item) => {
    const presentation = getStatusPresentation(item.status);

    return {
      ...item,
      color: statusColor(presentation.tone),
    };
  });

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-950">Theo trạng thái</h2>
      <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[16rem_minmax(0,1fr)] md:items-center">
        <div className="h-44">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                innerRadius={46}
                nameKey="label"
                outerRadius={70}
                paddingAngle={2}
              >
                {data.map((item) => (
                  <Cell fill={item.color} key={item.status} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} công việc`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {data.map((item) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"
              key={item.status}
            >
              <span className="flex items-center gap-2 text-slate-700">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
              <span className="font-semibold text-slate-950">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function statusColor(tone: string): string {
  switch (tone) {
    case "active":
      return "#0284c7";
    case "success":
      return "#059669";
    case "muted":
      return "#71717a";
    default:
      return "#64748b";
  }
}
