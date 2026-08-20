import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Link href="/dang-nhap">Đăng nhập</Link>
    </main>
  );
}
