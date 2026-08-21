"use client";

import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

type Option = {
  id: string;
  name: string;
};

type TaskFiltersProps = {
  projects?: Option[];
  tags?: Option[];
  values?: {
    projectId?: string;
    priority?: TaskPriority;
    query?: string;
    status?: TaskStatus;
    tagId?: string;
  };
};

const priorities: Array<{ label: string; value: TaskPriority | "" }> = [
  { label: "Tất cả", value: "" },
  { label: "Thấp", value: "LOW" },
  { label: "Trung bình", value: "MEDIUM" },
  { label: "Cao", value: "HIGH" },
  { label: "Khẩn cấp", value: "URGENT" },
];

const statuses: Array<{ label: string; value: TaskStatus | "" }> = [
  { label: "Tất cả", value: "" },
  { label: "Cần làm", value: "TODO" },
  { label: "Đang thực hiện", value: "IN_PROGRESS" },
  { label: "Hoàn thành", value: "DONE" },
  { label: "Đã hủy", value: "CANCELLED" },
];

export function TaskFilters({ projects = [], tags = [], values = {} }: TaskFiltersProps) {
  return (
    <form
      action="/app/cong-viec"
      aria-label="Lọc công việc"
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      method="get"
    >
      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">Tìm kiếm</span>
        <input
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          name="query"
          placeholder="Tìm công việc"
          type="search"
          defaultValue={values.query}
        />
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">Dự án</span>
        <select
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          name="projectId"
          defaultValue={values.projectId}
        >
          <option value="">Tất cả</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">Thẻ</span>
        <select
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          name="tagId"
          defaultValue={values.tagId}
        >
          <option value="">Tất cả</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">Ưu tiên</span>
        <select
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          name="priority"
          defaultValue={values.priority}
        >
          {priorities.map((priority) => (
            <option key={priority.value} value={priority.value}>
              {priority.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-700">Trạng thái</span>
        <select
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          name="status"
          defaultValue={values.status}
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <button
        className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
        type="submit"
      >
        Lọc
      </button>
    </form>
  );
}
