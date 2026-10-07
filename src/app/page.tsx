import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-6 text-white">
      <Link href="/login" className="text-sm text-[#f0c14b] underline-offset-4 hover:underline">
        Vào trang đăng nhập
      </Link>
    </main>
  );
}
