"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import {
  formatVietnamDateInput,
  formatVietnamTimeInput,
  vietnamDateTimeToUtcIso,
} from "@/lib/domain/time";
import type { SubtaskRecord } from "@/lib/tasks/subtask-repository";
import type { TaskPriority, TaskStatus, UpdateTaskInput } from "@/lib/validation/task";

import { ReminderEditor } from "./reminder-editor";
import { SubtaskList } from "./subtask-list";

type RecurrenceValue = "NONE" | "DAILY" | "WEEKLY";

type TaskDetailTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  important: boolean;
  urgent: boolean;
  eisenhowerOverride: boolean;
  tagIds: string[];
  reminderOffsets: number[];
};

type TaskDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, input: UpdateTaskInput) => Promise<boolean> | boolean;
  onDelete?: (taskId: string) => Promise<void> | void;
  onEisenhowerChange?: (
    taskId: string,
    value: { important: boolean; urgent: boolean; manual: boolean },
  ) => Promise<void> | void;
  task: TaskDetailTask;
  projects?: Array<{ id: string; name: string }>;
  tags?: Array<{ id: string; name: string }>;
  subtasks?: SubtaskRecord[];
  recurrence?: RecurrenceValue;
  onAddSubtask?: (taskId: string, title: string) => Promise<void> | void;
  onDeleteSubtask?: (subtaskId: string) => Promise<void> | void;
  onReorderSubtasks?: (taskId: string, orderedIds: string[]) => Promise<void> | void;
  onToggleSubtask?: (subtaskId: string, completed: boolean) => Promise<void> | void;
  onRecurrenceChange?: (taskId: string, value: RecurrenceValue) => Promise<void> | void;
};

type TaskDetailForm = Omit<TaskDetailTask, "id">;

const DEFAULT_TIME = "09:00";

const priorities: Array<{ label: string; value: TaskPriority }> = [
  { label: "Thấp", value: "LOW" },
  { label: "Trung bình", value: "MEDIUM" },
  { label: "Cao", value: "HIGH" },
  { label: "Khẩn cấp", value: "URGENT" },
];

const statuses: Array<{ label: string; value: TaskStatus }> = [
  { label: "Cần làm", value: "TODO" },
  { label: "Đang thực hiện", value: "IN_PROGRESS" },
  { label: "Hoàn thành", value: "DONE" },
  { label: "Đã hủy", value: "CANCELLED" },
];

function toForm(task: TaskDetailTask): TaskDetailForm {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    startAt: task.startAt,
    dueAt: task.dueAt,
    allDay: task.allDay,
    important: task.important,
    urgent: task.urgent,
    eisenhowerOverride: task.eisenhowerOverride,
    tagIds: task.tagIds,
    reminderOffsets: task.reminderOffsets,
  };
}

function toDateValue(value: string | null): string {
  return value === null ? "" : formatVietnamDateInput(new Date(value));
}

function toTimeValue(value: string | null): string {
  return value === null ? DEFAULT_TIME : formatVietnamTimeInput(new Date(value));
}

function toVietnamDateStart(value: string): string | null {
  return value === "" ? null : vietnamDateTimeToUtcIso(value, "00:00");
}

function toVietnamDeadline(dateValue: string, timeValue: string, allDay: boolean): string | null {
  if (dateValue === "") {
    return null;
  }

  return vietnamDateTimeToUtcIso(dateValue, allDay ? "00:00" : timeValue);
}

export function TaskDetailSheet({
  onClose,
  onDelete,
  onEisenhowerChange,
  onUpdate,
  open,
  projects = [],
  tags = [],
  subtasks = [],
  recurrence = "NONE",
  onAddSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  onToggleSubtask,
  onRecurrenceChange,
  task,
}: TaskDetailSheetProps) {
  const [form, setForm] = useState<TaskDetailForm>(() => toForm(task));
  const [recurrenceValue, setRecurrenceValue] = useState<RecurrenceValue>(recurrence);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      restoreFocusRef.current?.focus();
      return;
    }

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
  }, [open]);

  function updateField<Key extends keyof TaskDetailForm>(key: Key, value: TaskDetailForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateStartDate(value: string) {
    updateField("startAt", toVietnamDateStart(value));
  }

  function updateDueDate(value: string) {
    setForm((current) => ({
      ...current,
      dueAt: toVietnamDeadline(value, toTimeValue(current.dueAt), current.allDay),
    }));
  }

  function updateDueTime(value: string) {
    if (value === "") {
      return;
    }

    setForm((current) => ({
      ...current,
      dueAt: toVietnamDeadline(toDateValue(current.dueAt), value, current.allDay),
    }));
  }

  function updateAllDay(value: boolean) {
    setForm((current) => ({
      ...current,
      allDay: value,
      dueAt: current.dueAt === null
        ? null
        : toVietnamDeadline(toDateValue(current.dueAt), toTimeValue(current.dueAt), value),
    }));
  }

  function toggleTag(tagId: string) {
    updateField(
      "tagIds",
      form.tagIds.includes(tagId)
        ? form.tagIds.filter((id) => id !== tagId)
        : [...form.tagIds, tagId],
    );
  }

  function changeRecurrence(value: RecurrenceValue) {
    setRecurrenceValue(value);
    void onRecurrenceChange?.(task.id, value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();

    if (title.length === 0) return;

    const updated = await onUpdate(task.id, {
      title,
      description: form.description?.trim() || null,
      status: form.status,
      priority: form.priority,
      projectId: form.projectId,
      startAt: form.startAt,
      dueAt: form.dueAt,
      allDay: form.allDay,
      tagIds: form.tagIds,
      reminderOffsets: form.reminderOffsets,
    });

    if (!updated) return;

    if (
      onEisenhowerChange &&
      (form.important !== task.important ||
        form.urgent !== task.urgent ||
        form.eisenhowerOverride !== task.eisenhowerOverride)
    ) {
      await onEisenhowerChange(task.id, {
        important: form.important,
        urgent: form.urgent,
        manual: form.eisenhowerOverride,
      });
    }
  }

  if (!open) return null;

  return (
    <div
      aria-labelledby="task-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/40"
      onKeyDown={handleKeyDown}
      ref={dialogRef}
      role="dialog"
    >
      <form
        className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-xl sm:rounded-l-lg"
        onSubmit={submit}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-950" id="task-detail-title">
            Chi tiết công việc
          </h2>
          <button aria-label="Đóng" className="inline-flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={onClose} type="button">
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Tên công việc</span>
            <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950" onChange={(event) => updateField("title", event.target.value)} ref={titleRef} value={form.title} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Mô tả</span>
            <textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950" onChange={(event) => updateField("description", event.target.value)} value={form.description ?? ""} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Trạng thái</span>
              <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950" onChange={(event) => updateField("status", event.target.value as TaskStatus)} value={form.status}>
                {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Ưu tiên</span>
              <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950" onChange={(event) => updateField("priority", event.target.value as TaskPriority)} value={form.priority}>
                {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
              </select>
            </label>
          </div>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Dự án</span>
            <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950" onChange={(event) => updateField("projectId", event.target.value || null)} value={form.projectId ?? ""}>
              <option value="">Không có</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Thẻ</legend>
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <label className="flex items-center gap-2 text-sm text-slate-700" key={tag.id}>
                  <input checked={form.tagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} type="checkbox" />
                  {tag.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Ngày bắt đầu</span>
              <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950" onChange={(event) => updateStartDate(event.target.value)} type="date" value={toDateValue(form.startAt)} />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Hạn chót</span>
              <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950" onChange={(event) => updateDueDate(event.target.value)} type="date" value={toDateValue(form.dueAt)} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input checked={form.allDay} onChange={(event) => updateAllDay(event.target.checked)} type="checkbox" />
              Cả ngày
            </label>
            {!form.allDay ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Giờ hạn chót</span>
                <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950" onChange={(event) => updateDueTime(event.target.value)} type="time" value={toTimeValue(form.dueAt)} />
              </label>
            ) : null}
          </div>
          <SubtaskList
            onAdd={onAddSubtask}
            onDelete={onDeleteSubtask}
            onReorder={onReorderSubtasks}
            onToggle={onToggleSubtask}
            subtasks={subtasks}
            taskId={task.id}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ReminderEditor
              onChange={(offsets) => updateField("reminderOffsets", offsets)}
              value={form.reminderOffsets}
            />
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Lặp lại</span>
              <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-100" disabled={!onRecurrenceChange} onChange={(event) => changeRecurrence(event.target.value as RecurrenceValue)} value={recurrenceValue}>
                <option value="NONE">Không lặp lại</option>
                <option value="DAILY">Hằng ngày</option>
                <option value="WEEKLY">Hằng tuần</option>
              </select>
            </label>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Ma trận Eisenhower</legend>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700"><input checked={form.important} onChange={(event) => setForm((current) => ({ ...current, important: event.target.checked, eisenhowerOverride: true }))} type="checkbox" />Quan trọng</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input checked={form.urgent} onChange={(event) => setForm((current) => ({ ...current, urgent: event.target.checked, eisenhowerOverride: true }))} type="checkbox" />Khẩn cấp</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input checked={form.eisenhowerOverride} onChange={(event) => updateField("eisenhowerOverride", event.target.checked)} type="checkbox" />Ghi đè thủ công</label>
            </div>
          </fieldset>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            disabled={!onDelete}
            onClick={() => {
              if (onDelete && window.confirm("Bạn có chắc muốn xóa công việc này?")) {
                void onDelete(task.id);
              }
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Xóa công việc
          </button>
          <div className="flex gap-3">
            <button className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose} type="button">Đóng</button>
            <button className="inline-flex h-10 items-center justify-center rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700" type="submit">Lưu thay đổi</button>
          </div>
        </footer>
      </form>
    </div>
  );
}
