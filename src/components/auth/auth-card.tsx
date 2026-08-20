import Link from "next/link";
import {
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/actions/auth-actions";

type AuthCardProps = {
  mode: "login" | "signup" | "reset";
};

async function submitGoogleSignIn() {
  "use server";
  await signInWithGoogle();
}

async function submitEmailSignIn(formData: FormData) {
  "use server";
  await signInWithEmail(formData);
}

async function submitSignUp(formData: FormData) {
  "use server";
  await signUpWithEmail(formData);
}

async function submitPasswordReset(formData: FormData) {
  "use server";
  await requestPasswordReset(formData);
}

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
};

export function AuthCard({ mode }: AuthCardProps) {
  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const action = isLogin ? submitEmailSignIn : isSignup ? submitSignUp : submitPasswordReset;
  const pageContent = content[mode];

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-950">{pageContent.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{pageContent.description}</p>
        </header>

        {!isReset && (
          <>
            <form action={submitGoogleSignIn}>
              <button
                type="submit"
                className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Tiếp tục với Google
              </button>
            </form>
            <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              <span>hoặc</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

        <form action={action} className="space-y-4">
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
          {!isReset && (
            <label className="block text-sm font-medium text-slate-800">
              Mật khẩu
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
            className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            {pageContent.submitLabel}
          </button>
        </form>

        <footer className="mt-6 text-center text-sm text-slate-600">
          {isLogin && <Link href="/quen-mat-khau">Quên mật khẩu?</Link>}
          {isLogin && <p className="mt-3">Chưa có tài khoản? <Link href="/dang-ky">Đăng ký</Link></p>}
          {isSignup && <p>Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link></p>}
          {isReset && <Link href="/dang-nhap">Quay lại đăng nhập</Link>}
        </footer>
      </section>
    </main>
  );
}
