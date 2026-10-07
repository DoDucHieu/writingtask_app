"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const DEMO_EMAIL = "demo@writing.local";
const DEMO_PASSWORD = "demo1234";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch(isLogin ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isLogin ? { email, password } : { name, email, password }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(data?.error ?? "Không thực hiện được. Hãy thử lại.");
      return;
    }
    router.push("/essays");
    router.refresh();
  }

  async function loginDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(data?.error ?? "Tài khoản demo chưa sẵn sàng.");
      return;
    }
    router.push("/essays");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh bg-ink text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between border-b border-white/10 px-6 py-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#f0c14b]">IELTS TASK 2</p>
        <div className="my-10 max-w-xl">
          <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
            Viết từng câu, được góp ý ngay.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
            Đọc ý tiếng Việt, viết một câu tiếng Anh, rồi xem độ chính xác và cách diễn đạt hay hơn.
            Tài khoản mới có 20 lượt nộp. Mỗi ngày nhận thêm 10 lượt.
          </p>
          <div className="mt-8 rounded-2xl bg-[#3a3114] p-4 ring-1 ring-[#f0c14b]/50">
            <p className="font-serif text-lg leading-7">
              Free tuition would give students from low-income families a fair chance.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Học phí miễn phí sẽ cho sinh viên nhà nghèo một cơ hội công bằng.
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-600">Luyện trên điện thoại hoặc máy tính.</p>
      </section>

      <section className="flex items-center px-6 py-10 lg:px-12">
        <form onSubmit={submit} className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-semibold">{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {isLogin
              ? "Vào đúng bài đang viết dở."
              : "Tạo xong là có 20 lượt nộp để luyện ngay."}
          </p>

          {!isLogin && (
            <label className="mt-6 block text-sm">
              Tên
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none ring-[#f0c14b] focus:ring-2"
              />
            </label>
          )}
          <label className="mt-4 block text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none ring-[#f0c14b] focus:ring-2"
            />
          </label>
          <label className="mt-4 block text-sm">
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 outline-none ring-[#f0c14b] focus:ring-2"
            />
          </label>

          {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-xl bg-[#f0c14b] px-4 py-3 font-semibold text-[#1c1403] disabled:opacity-60"
          >
            {pending ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Tạo tài khoản"}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={loginDemo}
              disabled={pending}
              className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-200 disabled:opacity-60"
            >
              Dùng tài khoản demo
            </button>
          )}

          <p className="mt-6 text-sm text-zinc-400">
            {isLogin ? (
              <>
                Chưa có tài khoản?{" "}
                <Link href="/register" className="text-[#f0c14b]">
                  Đăng ký
                </Link>
              </>
            ) : (
              <>
                Đã có tài khoản?{" "}
                <Link href="/login" className="text-[#f0c14b]">
                  Đăng nhập
                </Link>
              </>
            )}
          </p>
          {isLogin && (
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Demo: {DEMO_EMAIL} · mật khẩu {DEMO_PASSWORD}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
