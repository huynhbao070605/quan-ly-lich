"use client";

import { AlertTriangle } from "lucide-react";

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message = "Không thể tải dữ liệu. Vui lòng thử lại.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle aria-hidden="true" className="size-10 text-red-700" />
      <h2 className="mt-4 text-base font-semibold text-red-900">Đã xảy ra lỗi</h2>
      <p className="mt-2 max-w-md text-sm text-red-800">{message}</p>
      {onRetry ? (
        <button
          className="mt-5 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
          onClick={onRetry}
          type="button"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}
