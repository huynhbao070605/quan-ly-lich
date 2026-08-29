import Link from "next/link";

export function AuthLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-3">
          <div className="h-3 w-24 animate-pulse rounded-full bg-emerald-100" />
          <div className="h-8 w-56 animate-pulse rounded-md bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded-md bg-slate-100" />
          <div className="h-4 w-3/4 animate-pulse rounded-md bg-slate-100" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Đang mở trang đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-600">
          Chuẩn bị không gian làm việc cá nhân của bạn.
        </p>
        <Link
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          href="/dang-nhap"
        >
          Mở trang đăng nhập
        </Link>
      </section>
    </main>
  );
}
