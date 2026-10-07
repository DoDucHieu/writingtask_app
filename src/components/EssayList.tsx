"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatChip } from "@/components/StatChip";
import type { EssaySummary, UserStats } from "@/lib/types";

export function EssayList() {
  const router = useRouter();
  const [user, setUser] = useState<UserStats | null>(null);
  const [essays, setEssays] = useState<EssaySummary[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const response = await fetch("/api/essays");
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    const data = (await response.json()) as { user: UserStats; essays: EssaySummary[]; error?: string };
    if (!response.ok) {
      setError(data.error ?? "Không tải được danh sách đề.");
      return;
    }
    setUser(data.user);
    setEssays(data.essays);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/essays")
      .then(async (response) => {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const data = (await response.json()) as {
          user?: UserStats;
          essays?: EssaySummary[];
          error?: string;
        };
        if (!active) return;
        if (!response.ok || !data.user || !data.essays) {
          setError(data.error ?? "Không tải được danh sách đề.");
          return;
        }
        setUser(data.user);
        setEssays(data.essays);
      })
      .catch(() => {
        if (active) setError("Không kết nối được máy chủ.");
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function topup() {
    setPending(true);
    setNotice("");
    setError("");
    const response = await fetch("/api/credits/topup", { method: "POST" });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(data?.error ?? "Chưa nhận được lượt.");
      return;
    }
    setNotice("Đã cộng 10 lượt nộp cho hôm nay.");
    await load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-ink text-white">
      <header className="border-b border-white/10 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f0c14b]">IELTS TASK 2</p>
            <h1 className="mt-1 text-xl font-semibold">
              {user ? `Xin chào, ${user.name}` : "Danh sách đề"}
            </h1>
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-2">
              <StatChip label="Lượt" value={user.credits} alert={user.credits === 0} />
              <StatChip label="Điểm" value={user.points.toLocaleString("vi-VN")} />
              <StatChip label="Chuỗi" value={`${user.streak} ngày`} />
              <button
                type="button"
                onClick={logout}
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm leading-6 text-zinc-400">
            Mỗi đề là một dàn ý 6 câu. Bạn viết tiếng Anh cho từng ý. Câu từ 70% mới sang câu sau,
            và mỗi lần nộp trừ 1 lượt.
          </p>
          <button
            type="button"
            onClick={topup}
            disabled={pending || !user?.canTopup}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            {user?.canTopup ? "Nhận 10 lượt hôm nay" : "Đã nhận lượt hôm nay"}
          </button>
        </div>
        {notice && <p className="mt-4 text-sm text-emerald-300">{notice}</p>}
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

        {!user && !error && <p className="mt-10 text-sm text-zinc-500">Đang tải đề...</p>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {essays.map((essay) => (
            <article key={essay.slug} className="rounded-2xl border border-white/10 bg-[#121214] p-5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium uppercase tracking-wider text-[#f0c14b]">{essay.topic}</span>
                <span className="text-zinc-500">
                  {essay.difficulty} · {essay.total} câu
                </span>
              </div>
              <h2 className="mt-3 font-serif text-2xl font-semibold">{essay.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{essay.prompt}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#f0c14b]"
                  style={{ width: `${essay.total ? (essay.done / essay.total) * 100 : 0}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {essay.status === "new" && "Chưa làm"}
                {essay.status === "in_progress" && `Đang làm ${essay.done}/${essay.total} câu`}
                {essay.status === "completed" && `Đã xong · ${essay.pointsEarned} điểm`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {essay.status === "completed" && essay.attemptId ? (
                  <Link
                    href={`/summary/${essay.attemptId}`}
                    className="rounded-xl bg-[#f0c14b] px-4 py-2 text-sm font-semibold text-[#1c1403]"
                  >
                    Xem tổng kết
                  </Link>
                ) : (
                  <Link
                    href={`/practice/${essay.slug}`}
                    className="rounded-xl bg-[#f0c14b] px-4 py-2 text-sm font-semibold text-[#1c1403]"
                  >
                    {essay.status === "in_progress" ? "Viết tiếp" : "Bắt đầu"}
                  </Link>
                )}
                {essay.status === "completed" && (
                  <Link
                    href={`/practice/${essay.slug}`}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm"
                  >
                    Luyện lại
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
