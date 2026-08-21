"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardProjectProgress } from "@/lib/dashboard/queries";

type ProjectProgressProps = {
  projects: DashboardProjectProgress[];
};

const fallbackColors = ["#0f766e", "#2563eb", "#7c3aed", "#f59e0b", "#db2777"];

export function ProjectProgress({ projects }: ProjectProgressProps) {
  if (projects.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-950">Tiến độ theo dự án</h2>
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          Chưa có dự án đang hoạt động.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">Tiến độ theo dự án</h2>
        <span className="text-sm text-slate-500">{projects.length} dự án</span>
      </div>

      <div className="h-64 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={projects} layout="vertical" margin={{ left: 12, right: 12 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" />
            <XAxis dataKey="completionPercentage" domain={[0, 100]} type="number" unit="%" />
            <YAxis dataKey="name" type="category" width={96} />
            <Tooltip
              formatter={(value, name) =>
                name === "completionPercentage" ? [`${value}%`, "Hoàn thành"] : value
              }
              labelFormatter={(label) => `Dự án: ${label}`}
            />
            <Bar dataKey="completionPercentage" radius={[0, 4, 4, 0]}>
              {projects.map((project, index) => (
                <Cell
                  fill={project.color ?? fallbackColors[index % fallbackColors.length]}
                  key={project.id}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project, index) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            key={project.id}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      project.color ?? fallbackColors[index % fallbackColors.length],
                  }}
                />
                <h3 className="truncate text-sm font-semibold text-slate-950">
                  {project.name}
                </h3>
              </div>
              <span className="text-sm font-medium text-slate-700">
                {project.completionPercentage}%
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {project.doneCount}/{project.taskCount} công việc hoàn thành
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
