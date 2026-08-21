"use client";

import { Plus } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import type { CreateTaskInput, TaskPriority } from "@/lib/validation/task";

type QuickAddTaskProps = {
  onCreate: (input: CreateTaskInput) => Promise<void> | void;
  projects?: Array<{ id: string; name: string }>;
};

const priorities: Array<{ label: string; value: TaskPriority }> = [
  { label: "Thấp", value: "LOW" },
  { label: "Trung bình", value: "MEDIUM" },
  { label: "Cao", value: "HIGH" },
  { label: "Khẩn cấp", value: "URGENT" },
];

export function QuickAddTask({ onCreate, projects = [] }: QuickAddTaskProps) {
  const [allDay, setAllDay] = useState(true);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");

  async function submit() {
    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      return;
    }

    await onCreate({
      title: trimmedTitle,
      priority,
      dueAt: date === "" ? undefined : new Date(date).toISOString(),
      projectId: projectId === "" ? undefined : projectId,
      description: description.trim() === "" ? undefined : description.trim(),
      allDay,
    });
    setTitle("");
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !isComposing && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(10rem,1fr)_auto]">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Tên công việc</span>
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setTitle(event.target.value)}
            onCompositionEnd={() => setIsComposing(false)}
            onCompositionStart={() => setIsComposing(true)}
            onKeyDown={handleTitleKeyDown}
            value={title}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Ngày</span>
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Ưu tiên</span>
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            value={priority}
          >
            {priorities.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Dự án</span>
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setProjectId(event.target.value)}
            value={projectId}
          >
            <option value="">Không có</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <button
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Thêm tùy chọn
        </button>
      </div>

      {expanded ? (
        <div className="grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Lặp lại</span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              disabled
              value=""
            >
              <option value="">Chưa khả dụng</option>
            </select>
          </label>

          <label className="flex items-end gap-2 pb-2">
            <input
              checked={allDay}
              className="size-4 rounded border-slate-300 text-teal-600"
              onChange={(event) => setAllDay(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium text-slate-700">Cả ngày</span>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Mô tả</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
          type="submit"
        >
          Tạo công việc
        </button>
      </div>
    </form>
  );
}
