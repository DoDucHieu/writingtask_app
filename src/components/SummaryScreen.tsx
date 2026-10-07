"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SummaryState } from "@/lib/types";

export function SummaryScreen({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [state, setState] = useState<SummaryState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/attempts/${attemptId}`)
      .then(async (response) => {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const data = (await response.json()) as SummaryState & { error?: string };
        if (!active) return;
        if (!response.ok) {
          setError(data.error ?? "Không tải được tổng kết.");
          return;
        }
        setState(data);
      })
      .catch(() => {
        if (active) setError("Không kết nối được máy chủ.");
      });
    return () => {
      active = false;
    };
  }, [attemptId, router]);

  if (!state) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink px-6 text-sm text-zinc-400">
        {error || "Đang tổng kết bài..."}
      </main>
    );
  }

  const finished = state.status === "completed";

  return (
    <main className="min-h-dvh bg-ink px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/essays" className="text-sm text-zinc-400 hover:text-white">
          ← Danh sách đề
        </Link>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f0c14b]">
          {finished ? "Đã xong bài" : "Bài chưa xong"} · {state.essay.topic}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">{state.essay.title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{state.essay.prompt}</p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[#f0c14b] px-3 py-3 text-[#1c1403]">
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Độ chính xác</p>
            <p className="text-xl font-bold">
              {state.averageAccuracy === null ? "—" : `${state.averageAccuracy.toFixed(0)}%`}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Điểm bài này</p>
            <p className="text-xl font-bold">{state.pointsEarned}</p>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Lượt còn</p>
            <p className="text-xl font-bold">{state.user.credits}</p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {state.sentences.map((sentence) => (
            <article key={sentence.order} className="rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Câu {sentence.order}</span>
                <span>
                  {sentence.accuracy === null
                    ? "Chưa nộp"
                    : sentence.isPerfect
                      ? "✓ Good translation!"
                      : `${sentence.accuracy.toFixed(2)}%`}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">{sentence.vietnameseHint}</p>
              <p className="mt-2 font-serif text-lg leading-7">
                {sentence.englishText ?? "Bạn chưa có câu được lưu."}
              </p>
              {sentence.comment && <p className="mt-2 text-sm text-zinc-300">{sentence.comment}</p>}
              {sentence.suggestedImprovements.length > 0 && (
                <ul className="mt-3 space-y-2 border-l-2 border-[#f0c14b]/40 pl-3">
                  {sentence.suggestedImprovements.map((item) => (
                    <li key={item.title + item.explanation}>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-6 text-zinc-400">{item.explanation}</p>
                      {item.example && (
                        <p className="mt-0.5 font-serif text-sm text-[#f0c14b]">{item.example}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-zinc-400">Một cách viết đạt</summary>
                <p className="mt-2 font-serif text-[#f0c14b]">{sentence.referenceEnglish}</p>
              </details>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/essays"
            className="rounded-xl bg-[#f0c14b] px-4 py-3 text-sm font-semibold text-[#1c1403]"
          >
            Chọn đề khác
          </Link>
          <Link
            href={`/practice/${state.essay.slug}`}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm"
          >
            {finished ? "Luyện lại đề này" : "Viết tiếp"}
          </Link>
        </div>
      </div>
    </main>
  );
}
