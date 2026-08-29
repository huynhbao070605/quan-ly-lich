"use client";

import { useActionState } from "react";

import { deleteCurrentAccount, signOut } from "@/actions/account-actions";
import type { AccountActionResult } from "@/actions/account-actions";

const initialState: AccountActionResult = { ok: false, message: "" };

export function AccountForm() {
  const [signOutState, signOutAction, isSigningOut] = useActionState<
    AccountActionResult,
    FormData
  >(async () => signOut(), initialState);
  const [state, deleteAction, isPending] = useActionState<AccountActionResult, FormData>(
    async (_previousState, formData) =>
      deleteCurrentAccount(String(formData.get("confirmation") ?? "")),
    initialState,
  );

  return (
    <div className="space-y-6">
      <form action={signOutAction} className="space-y-2">
        <button
          className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          disabled={isSigningOut}
          type="submit"
        >
          Đăng xuất
        </button>
        {signOutState.message ? (
          <p className="text-sm text-red-700" role="alert">
            {signOutState.message}
          </p>
        ) : null}
      </form>

      <form action={deleteAction} className="space-y-4 rounded-md border border-red-200 p-4">
        <div>
          <h3 className="text-base font-semibold text-red-800">Xóa tài khoản</h3>
          <p className="mt-1 text-sm text-red-700">
            Hành động này sẽ xóa vĩnh viễn dữ liệu thuộc tài khoản của bạn.
          </p>
        </div>

        <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <li>Công việc</li>
          <li>Dự án</li>
          <li>Thẻ</li>
          <li>Danh sách kiểm tra</li>
          <li>Thông báo</li>
        </ul>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Nhập DELETE để xác nhận</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            disabled={isPending}
            name="confirmation"
            type="text"
          />
        </label>

        <button
          className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          Xóa tài khoản
        </button>

        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="alert">
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
