export function LoadingState() {
  return (
    <div aria-label="Đang tải dữ liệu" className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-md bg-slate-200" />
        <div className="h-28 animate-pulse rounded-md bg-slate-200" />
        <div className="h-28 animate-pulse rounded-md bg-slate-200" />
      </div>
      <div className="h-64 animate-pulse rounded-md bg-slate-200" />
    </div>
  );
}
