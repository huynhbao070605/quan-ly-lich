"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  updatePassword,
} from "@/actions/auth-actions";
import type { AuthActionResult } from "@/actions/auth-actions";

type AuthCardProps = {
  mode: "login" | "signup" | "reset" | "updatePassword";
};

const initialState = { ok: false, message: "" };

const content = {
  login: {
    title: "Đăng nhập",
    description: "Chào mừng bạn quay trở lại.",
    submitLabel: "Đăng nhập",
  },
  signup: {
    title: "Đăng ký",
    description: "Tạo tài khoản để quản lý công việc cá nhân.",
    submitLabel: "Đăng ký",
  },
  reset: {
    title: "Quên mật khẩu",
    description: "Nhập email để nhận liên kết đặt lại mật khẩu.",
    submitLabel: "Gửi email đặt lại",
  },
  updatePassword: {
    title: "Đặt lại mật khẩu",
    description: "Chọn mật khẩu mới cho tài khoản của bạn.",
    submitLabel: "Cập nhật mật khẩu",
  },
};

export function AuthCard({ mode }: AuthCardProps) {
  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isResetRequest = mode === "reset";
  const isPasswordUpdate = mode === "updatePassword";
  const [state, formAction, isPending] = useActionState<AuthActionResult, FormData>(
    async (_previousState: AuthActionResult, formData: FormData) => {
      if (isLogin) {
        return signInWithEmail(formData);
      }

      if (isSignup) {
        return signUpWithEmail(formData);
      }

      return isPasswordUpdate ? updatePassword(formData) : requestPasswordReset(formData);
    },
    initialState,
  );
  const [googleState, googleFormAction, isGooglePending] = useActionState(
    async () => signInWithGoogle(),
    initialState,
  );
  const pageContent = content[mode];
  const showEmailConfirmation = isSignup && state.status === "emailConfirmationRequired";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-950">{pageContent.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{pageContent.description}</p>
        </header>

        {!isResetRequest && !isPasswordUpdate && (
          <>
            <form action={googleFormAction}>
              <button
                type="submit"
                disabled={isGooglePending}
                className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Tiếp tục với Google
              </button>
            </form>
            {googleState.message && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {googleState.message}
              </p>
            )}
            <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              <span>hoặc</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

        <form action={formAction} className="space-y-4">
          {isSignup && (
            <label className="block text-sm font-medium text-slate-800">
              Họ và tên
              <input
                name="displayName"
                type="text"
                autoComplete="name"
                required
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
              />
            </label>
          )}
          {!isPasswordUpdate && (
            <label className="block text-sm font-medium text-slate-800">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
              />
            </label>
          )}
          {!isResetRequest && (
            <label className="block text-sm font-medium text-slate-800">
              {isPasswordUpdate ? "Mật khẩu mới" : "Mật khẩu"}
              <input
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
              />
            </label>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            {pageContent.submitLabel}
          </button>
          {showEmailConfirmation && (
            <section
              className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
              role="alert"
            >
              <h2 className="font-semibold text-emerald-950">Kiểm tra email của bạn</h2>
              <p className="mt-1">{state.message}</p>
            </section>
          )}
          {state.message && !showEmailConfirmation && (
            <p
              className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
              role="alert"
            >
              {state.message}
            </p>
          )}
        </form>

        <footer className="mt-6 text-center text-sm text-slate-600">
          {isLogin && <Link href="/quen-mat-khau">Quên mật khẩu?</Link>}
          {isLogin && <p className="mt-3">Chưa có tài khoản? <Link href="/dang-ky">Đăng ký</Link></p>}
          {isSignup && <p>Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link></p>}
          {isResetRequest && <Link href="/dang-nhap">Quay lại đăng nhập</Link>}
          {isPasswordUpdate && <Link href="/dang-nhap">Quay lại đăng nhập</Link>}
        </footer>
      </section>
    </main>
  );
}
