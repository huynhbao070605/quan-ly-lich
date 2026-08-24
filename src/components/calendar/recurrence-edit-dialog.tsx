"use client";

type RecurrenceEditDialogProps = {
  open: boolean;
  onCancel: () => void;
  onOccurrenceOnly: () => void;
  onThisAndFuture: () => void;
};

export function RecurrenceEditDialog({
  onCancel,
  onOccurrenceOnly,
  onThisAndFuture,
  open,
}: RecurrenceEditDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="recurrence-edit-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl">
        <h2
          className="text-base font-semibold text-slate-950"
          id="recurrence-edit-title"
        >
          Chỉnh sửa công việc lặp lại
        </h2>
        <div className="mt-4 flex flex-col gap-2">
          <button
            className="h-10 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700"
            onClick={onOccurrenceOnly}
            type="button"
          >
            Chỉ lần này
          </button>
          <button
            className="h-10 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onThisAndFuture}
            type="button"
          >
            Lần này và các lần sau
          </button>
          <button
            className="h-10 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
