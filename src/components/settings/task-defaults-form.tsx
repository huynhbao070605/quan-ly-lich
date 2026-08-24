"use client";

import { useState, useTransition } from "react";

import { updateTaskDefaults } from "@/actions/settings-actions";
import type { DefaultTaskView, SettingsActionResult } from "@/actions/settings-actions";
import { ReminderEditor } from "@/components/tasks/reminder-editor";
import type { TaskPriority } from "@/lib/validation/task";

type TaskDefaultsFormProps = {
  initialDefaultPriority: TaskPriority;
  initialDefaultTaskView: DefaultTaskView;
  initialReminderOffsets: number[];
};

const priorityOptions: Array<{ label: string; value: TaskPriority }> = [
  { label: "Thấp", value: "LOW" },
  { label: "Trung bình", value: "MEDIUM" },
  { label: "Cao", value: "HIGH" },
  { label: "Khẩn cấp", value: "URGENT" },
];

const viewOptions: Array<{ label: string; value: DefaultTaskView }> = [
  { label: "Danh sách", value: "list" },
  { label: "Kanban", value: "kanban" },
  { label: "Lịch", value: "calendar" },
  { label: "Eisenhower", value: "eisenhower" },
  { label: "Kế hoạch ngày", value: "daily" },
  { label: "Kế hoạch tuần", value: "weekly" },
];

const initialState: SettingsActionResult = { ok: false, message: "" };

export function TaskDefaultsForm({
  initialDefaultPriority,
  initialDefaultTaskView,
  initialReminderOffsets,
}: TaskDefaultsFormProps) {
  const [defaultPriority, setDefaultPriority] = useState(initialDefaultPriority);
  const [defaultTaskView, setDefaultTaskView] = useState(initialDefaultTaskView);
  const [reminderOffsets, setReminderOffsets] = useState(initialReminderOffsets);
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateTaskDefaults({
        defaultPriority,
        defaultReminderOffsetsMinutes: reminderOffsets,
        weekStart: 1,
        defaultTaskView,
      });
      setState(result);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Mức ưu tiên mặc định</span>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={isPending}
            onChange={(event) => setDefaultPriority(event.target.value as TaskPriority)}
            value={defaultPriority}
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Chế độ xem mặc định</span>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={isPending}
            onChange={(event) => setDefaultTaskView(event.target.value as DefaultTaskView)}
            value={defaultTaskView}
          >
            {viewOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 px-3 py-2">
          <p className="text-xs font-medium uppercase text-slate-500">Múi giờ</p>
          <p className="mt-1 text-sm text-slate-900">Asia/Ho_Chi_Minh (UTC+7)</p>
        </div>
        <div className="rounded-md border border-slate-200 px-3 py-2">
          <p className="text-xs font-medium uppercase text-slate-500">Tuần bắt đầu</p>
          <p className="mt-1 text-sm text-slate-900">Thứ Hai</p>
        </div>
      </div>

      <ReminderEditor
        disabled={isPending}
        label="Nhắc việc mặc định"
        onChange={setReminderOffsets}
        value={reminderOffsets}
      />

      <button
        className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={save}
        type="button"
      >
        Lưu thiết lập công việc
      </button>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
