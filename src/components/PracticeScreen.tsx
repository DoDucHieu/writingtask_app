"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { StatChip } from "@/components/StatChip";
import type { PracticeState } from "@/lib/types";

export function PracticeScreen({ essayId }: { essayId: string }) {
  const router = useRouter();
  const [state, setState] = useState<PracticeState | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/practice/${essayId}`)
      .then(async (response) => {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const data = (await response.json()) as PracticeState & { error?: string };
        if (!active) return;
        if (!response.ok) {
          setError(data.error ?? "Không mở được bài luyện.");
          return;
        }
        setState(data);
        const current = data.sentences.find((sentence) => sentence.status === "current");
        setDraft(current?.englishText ?? "");
      })
      .catch(() => {
        if (active) setError("Không kết nối được máy chủ.");
      });
    return () => {
      active = false;
    };
  }, [essayId, router]);

  const current = state?.sentences.find((sentence) => sentence.status === "current");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!state || pending) return;
    if (state.user.credits < 1) {
      setCreditOpen(true);
      return;
    }
    setPending(true);
    setError("");
    const response = await fetch(`/api/practice/${essayId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft }),
    });
    const data = (await response.json().catch(() => null)) as
      | (PracticeState & { error?: string; code?: string; completed?: boolean })
      | null;
    setPending(false);
    if (!data) {
      setError("Không nhận được kết quả chấm.");
      return;
    }
    if (data.sentences) setState(data);
    if (!response.ok) {
      if (data.code === "NO_CREDITS") setCreditOpen(true);
      setError(data.error ?? "Chưa nộp được câu.");
      return;
    }
    if (data.completed) {
      router.push(`/summary/${data.attemptId}`);
      return;
    }
    if (data.progress.done > state.progress.done) setDraft("");
    setHintOpen(false);
    document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function topup() {
    setPending(true);
    setError("");
    const response = await fetch("/api/credits/topup", { method: "POST" });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(data?.error ?? "Chưa nhận được lượt.");
      return;
    }
    const refreshed = await fetch(`/api/practice/${essayId}`);
    if (refreshed.ok) setState((await refreshed.json()) as PracticeState);
    setCreditOpen(false);
  }

  if (!state) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink px-6 text-sm text-zinc-400">
        {error || "Đang mở bài luyện..."}
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col bg-ink text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 md:px-5">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em]">IELTS TASK 2</p>
          <p className="text-[11px] text-zinc-500">{state.essay.title}</p>
        </div>
        <div className="flex gap-1.5">
          <StatChip label="Lượt" value={state.user.credits} alert={state.user.credits === 0} />
          <StatChip label="Điểm" value={state.user.points} />
          <StatChip
            label="Tiến độ"
            value={`${state.progress.done}/${state.progress.total}`}
          />
        </div>
      </header>

      <div className="shrink-0 border-b border-white/10 px-4 py-4 md:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f0c14b]">
          {state.essay.topic} · {state.essay.difficulty}
        </p>
        <h1 className="mt-2 max-w-4xl font-serif text-xl font-semibold leading-snug md:text-2xl">
          {state.essay.prompt}
        </h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 md:px-5">
          {state.sentences.map((sentence) => {
            const active = sentence.status === "current";
            const english = active ? draft : sentence.englishText;
            return (
              <article
                key={sentence.id}
                className={`rounded-xl px-3 py-3 ${
                  active
                    ? "bg-[#3a3114] ring-1 ring-[#f0c14b]/80"
                    : sentence.status === "locked"
                      ? "opacity-45"
                      : "bg-white/[0.03]"
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Câu {sentence.order}</span>
                  {sentence.accuracy !== null && <span>{sentence.accuracy.toFixed(0)}%</span>}
                </div>
                <p className="font-serif text-base leading-7 md:text-lg">
                  {english?.trim()
                    ? english
                    : active
                      ? "Câu tiếng Anh của bạn hiện ở đây khi bạn gõ."
                      : "…"}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">{sentence.vietnameseHint}</p>
              </article>
            );
          })}
        </section>

        <aside
          id="feedback"
          className="max-h-[42vh] shrink-0 space-y-4 overflow-y-auto border-t border-white/10 px-4 py-4 lg:max-h-none lg:w-[340px] lg:border-t-0 lg:border-l"
        >
          <DictionaryPanel />

          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Độ chính xác
            </h2>
            <p
              className={`mt-1 font-serif text-3xl font-semibold ${
                !state.feedback
                  ? "text-zinc-600"
                  : state.feedback.accuracy >= 98
                    ? "text-emerald-300"
                    : state.feedback.accuracy >= 70
                      ? "text-[#f0c14b]"
                      : "text-rose-300"
              }`}
            >
              {state.feedback ? `${state.feedback.accuracy.toFixed(2)}%` : "—"}
            </p>
            {state.feedback && (
              <p className="mt-1 text-[11px] text-zinc-500">
                {state.feedback.aiMode === "demo"
                  ? "Đang chấm mẫu. Thêm API key để giáo viên AI chấm."
                  : "Giáo viên AI vừa chấm câu này."}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Gợi ý cải thiện
            </h2>
            {state.feedback?.isPerfect ? (
              <p className="mt-2 text-sm font-medium text-emerald-300">✓ Good translation!</p>
            ) : state.feedback && state.feedback.suggestedImprovements.length > 0 ? (
              <ul className="mt-2 space-y-3">
                {state.feedback.suggestedImprovements.map((item) => (
                  <li key={item.title + item.explanation}>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-300">{item.explanation}</p>
                    {item.example && (
                      <p className="mt-1 font-serif text-sm text-[#f0c14b]">{item.example}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Nộp một câu để nhận góp ý.</p>
            )}
          </section>

          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Nhận xét
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {state.feedback?.comment ?? "Nhận xét sẽ hiện bằng tiếng Việt ngay sau khi nộp."}
            </p>
          </section>

          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Thành tích hôm nay
            </h2>
            {state.user.achievements.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">Viết một câu đạt để mở huy hiệu.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {state.user.achievements.map((item) => (
                  <li key={item.title} className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-sm font-medium text-[#f0c14b]">{item.title}</p>
                    <p className="text-xs text-zinc-400">{item.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <form
        onSubmit={submit}
        className="shrink-0 border-t border-white/10 bg-[#09090b] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5"
      >
        {error && <p className="mb-2 text-sm text-rose-300">{error}</p>}
        {hintOpen && current && (
          <div className="mb-3 rounded-xl bg-[#10203d] px-3 py-3 text-sm">
            <p className="font-medium text-sky-200">Gợi ý câu {current.order}</p>
            <p className="mt-1 leading-6 text-zinc-200">{current.structureTip}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {current.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full bg-white/10 px-2 py-1 text-xs">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
        {confirmQuit && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
            <span>Tiến độ được giữ. Bạn có thể viết tiếp sau.</span>
            <button
              type="button"
              onClick={() => router.push("/essays")}
              className="rounded-lg bg-zinc-700 px-3 py-1.5"
            >
              Thoát
            </button>
            <button type="button" onClick={() => setConfirmQuit(false)} className="px-2 py-1.5">
              Ở lại
            </button>
          </div>
        )}
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          placeholder={current ? "Viết một câu tiếng Anh cho ý đang được tô vàng" : "Đã hết câu"}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-serif text-base outline-none ring-[#f0c14b] focus:ring-2"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmQuit(true)}
            className="rounded-xl bg-zinc-700 px-4 py-3 text-sm font-medium"
          >
            Thoát
          </button>
          <button
            type="button"
            onClick={() => setHintOpen((open) => !open)}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium"
          >
            Gợi ý
          </button>
          <button
            type="submit"
            disabled={pending || !current}
            className="flex-1 rounded-xl bg-[#f0c14b] px-4 py-3 text-sm font-semibold text-[#1c1403] disabled:opacity-60"
          >
            {pending ? "Đang chấm..." : "Nộp · trừ 1 lượt"}
          </button>
        </div>
      </form>

      {creditOpen && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-[#16161a] p-5 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold">Hết lượt nộp</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Mỗi câu nộp tốn 1 lượt. Tài khoản mới có 20 lượt. Mỗi ngày bạn được nhận thêm 10 lượt
              miễn phí. Gói trả phí sẽ gắn sau.
            </p>
            <div className="mt-4 flex gap-2">
              {state.user.canTopup ? (
                <button
                  type="button"
                  onClick={topup}
                  disabled={pending}
                  className="flex-1 rounded-xl bg-[#f0c14b] px-3 py-2.5 text-sm font-semibold text-[#1c1403]"
                >
                  Nhận 10 lượt hôm nay
                </button>
              ) : (
                <p className="flex-1 text-sm text-zinc-400">Bạn đã nhận lượt miễn phí hôm nay.</p>
              )}
              <button
                type="button"
                onClick={() => setCreditOpen(false)}
                className="rounded-xl bg-white/10 px-3 py-2.5 text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
