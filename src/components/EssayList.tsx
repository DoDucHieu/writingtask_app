"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FlameIcon, StarIcon, TokenIcon } from "@/components/icons";
import { beginRoute } from "@/components/RouteProgress";
import { Bone } from "@/components/Skeleton";
import { StatChip } from "@/components/StatChip";
import type { EssaySummary, UserStats } from "@/lib/types";

export function EssayList() {
  const router = useRouter();
  const [user, setUser] = useState<UserStats | null>(null);
  const [essays, setEssays] = useState<EssaySummary[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/essays")
      .then(async (response) => {
        if (response.status === 401) {
          beginRoute();
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
    const data = (await response.json().catch(() => null)) as
      | { error?: string; user?: UserStats }
      | null;
    setPending(false);
    if (data?.user) setUser(data.user);
    if (!response.ok) {
      setError(data?.error ?? "Chưa nhận được token.");
      return;
    }
    setNotice("Đã cộng 10 token cho hôm nay.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    beginRoute();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-ink text-fg">
      <header className="border-b border-white/10 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-gold">IELTS TASK 2</p>
            <h1 className="mt-1 text-xl font-semibold">
              {user ? `Xin chào, ${user.name}` : "Danh sách đề"}
            </h1>
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-2">
              <StatChip
                label="Token"
                value={user.credits}
                icon={<TokenIcon className="h-4 w-4" />}
                alert={user.credits === 0}
              />
              <StatChip
                label="Điểm"
                value={user.points.toLocaleString("vi-VN")}
                icon={<StarIcon className="h-4 w-4" />}
              />
              <StatChip
                label="Chuỗi"
                value={`${user.streak} ngày`}
                icon={<FlameIcon className="h-4 w-4" />}
              />
              <button
                type="button"
                onClick={logout}
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-fg"
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
            và mỗi lần nộp trừ 1 token.
          </p>
          <button
            type="button"
            onClick={topup}
            disabled={pending || !user?.canTopup}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            <TokenIcon className="h-4 w-4 text-gold" />
            {user?.canTopup ? "Nhận 10 token hôm nay" : "Đã nhận token hôm nay"}
          </button>
        </div>
        {notice && <p className="mt-4 text-sm text-emerald-300">{notice}</p>}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {!user && !error && (
          <>
            <p className="sr-only">Đang tải đề</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2" aria-hidden="true">
            {[0, 1].map((item) => (
              <article key={item} className="rounded-2xl border border-white/10 bg-surface p-5">
                <div className="flex items-center justify-between">
                  <Bone className="h-3 w-24" />
                  <Bone className="h-3 w-20" />
                </div>
                <Bone className="mt-4 h-7 w-2/3" />
                <Bone className="mt-3 h-4 w-full" />
                <Bone className="mt-2 h-4 w-5/6" />
                <Bone className="mt-4 h-1.5 w-full rounded-full" />
                <Bone className="mt-4 h-9 w-28 rounded-xl" />
              </article>
            ))}
            </div>
          </>
        )}

        {user && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
          {essays.map((essay) => (
            <article key={essay.slug} className="rounded-2xl border border-white/10 bg-surface p-5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium uppercase tracking-wider text-gold">{essay.topic}</span>
                <span className="text-zinc-500">
                  {essay.difficulty} · {essay.total} câu
                </span>
              </div>
              <h2 className="mt-3 font-serif text-2xl font-semibold">{essay.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{essay.prompt}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gold"
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
                    className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-gold-ink"
                  >
                    Xem tổng kết
                  </Link>
                ) : (
                  <Link
                    href={`/practice/${essay.slug}`}
                    className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-gold-ink"
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
        )}
      </div>
    </main>
  );
}
