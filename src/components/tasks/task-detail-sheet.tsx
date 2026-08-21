"use client";

import { X } from "lucide-react";

type TaskDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  task?: {
    title: string;
    description?: string | null;
    priority?: string;
    status?: string;
  };
};

export function TaskDetailSheet({ onClose, open, task }: TaskDetailSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/40"
      role="dialog"
    >
      <div className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-xl sm:rounded-l-lg">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-950">Chi tiết công việc</h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Tên công việc</span>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
              defaultValue={task?.title ?? ""}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Mô tả</span>
            <textarea
              className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
              defaultValue={task?.description ?? ""}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Trạng thái</span>
              <select
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                defaultValue={task?.status ?? "TODO"}
              >
                <option value="TODO">Cần làm</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="DONE">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Ưu tiên</span>
              <select
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                defaultValue={task?.priority ?? "MEDIUM"}
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Ngày bắt đầu</span>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                type="date"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Hạn chót</span>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                type="date"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
