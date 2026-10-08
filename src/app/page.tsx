import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-6 text-fg">
      <Link href="/login" className="text-sm text-gold underline-offset-4 hover:underline">
        Vào trang đăng nhập
      </Link>
    </main>
  );
}
