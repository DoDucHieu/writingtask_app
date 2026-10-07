"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { StatChip } from "@/components/StatChip";
import { Spinner } from "@/components/Spinner";
import { StepRail } from "@/components/StepRail";
import { BottomSheet } from "@/components/BottomSheet";
import type { Achievement, PracticeSentence, PracticeState, UserStats } from "@/lib/types";

export function PracticeScreen({ essayId }: { essayId: string }) {
  const router = useRouter();
  const [state, setState] = useState<PracticeState | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [gradedId, setGradedId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [sheet, setSheet] = useState<"feedback" | "dictionary" | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentRef = useRef<HTMLElement>(null);
  const summaryButtonRef = useRef<HTMLButtonElement>(null);
  const refocusOnCloseRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
  const reviewed = state?.sentences.find(
    (sentence) => sentence.id === reviewId && sentence.status === "done",
  );
  // Quy tắc: câu nào đang được chọn (xanh = câu đã đạt, vàng = câu đang làm) thì panel phải hiện góp ý của câu đó.
  const selected = reviewed ?? current;
  const feedback = reviewed ? reviewed.feedback : (state?.feedback ?? null);
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const currentId = current?.id;

  useEffect(() => {
    if (newAchievements.length === 0) return;
    const timeout = setTimeout(() => setNewAchievements([]), 5000);
    return () => clearTimeout(timeout);
  }, [newAchievements]);

  const completed = state?.completed ?? false;
  useEffect(() => {
    if (completed) summaryButtonRef.current?.focus();
  }, [completed]);

  useEffect(() => {
    if (!currentId) return;
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentId]);

  // Dưới breakpoint lg (1024px) sidebar ẩn, góp ý và từ điển mở dạng ngăn kéo từ dưới lên.
  function isMobile() {
    return window.matchMedia("(max-width: 1023px)").matches;
  }

  function closeSheet() {
    setSheet(null);
    if (refocusOnCloseRef.current && current) textareaRef.current?.focus();
    refocusOnCloseRef.current = false;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!state || pending || !current) return;
    if (state.user.credits < 1) {
      setCreditOpen(true);
      return;
    }
    setPending(true);
    setError("");
    setReviewId(null);
    setGradedId(null);
    setLastDurationMs(null);
    const startedAt = performance.now();
    setElapsedMs(0);
    timerRef.current = setInterval(() => setElapsedMs(performance.now() - startedAt), 100);

    try {
      const response = await fetch(`/api/practice/${essayId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      const data = (await response.json().catch(() => null)) as
        | (PracticeState & { error?: string; code?: string; completed?: boolean })
        | null;
      if (!data) {
        setError("Không nhận được kết quả chấm.");
        return;
      }
      if (data.sentences) {
        const known = new Set(state.user.achievements.map((item) => item.title));
        const earned = data.user.achievements.filter((item) => !known.has(item.title));
        if (earned.length > 0) setNewAchievements(earned);
        setState(data);
      }
      if (!response.ok) {
        if (data.code === "NO_CREDITS") setCreditOpen(true);
        setError(data.error ?? "Chưa nộp được câu.");
        return;
      }
      setHintOpen(false);
      setGradedId(current.id);
      const advanced = data.progress.done > state.progress.done;
      const mobile = isMobile();
      if (advanced) {
        // Giữ câu vừa đạt ở trạng thái được chọn để đọc góp ý; gõ câu mới sẽ bỏ chọn.
        setReviewId(current.id);
        setDraft("");
      }
      if (mobile) {
        // Mở ngăn kéo góp ý; con trỏ quay lại ô nhập khi đóng ngăn kéo.
        textareaRef.current?.blur();
        refocusOnCloseRef.current = true;
        setSheet("feedback");
      } else if (advanced) {
        // Câu cuối: ở lại để đọc góp ý, người học tự bấm sang tổng kết (nút được focus trong effect).
        if (!data.completed) textareaRef.current?.focus();
      } else {
        document
          .getElementById("feedback")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setLastDurationMs(performance.now() - startedAt);
      setPending(false);
    }
  }

  async function topup() {
    setPending(true);
    setError("");
    const response = await fetch("/api/credits/topup", { method: "POST" });
    const data = (await response.json().catch(() => null)) as
      | { error?: string; user?: UserStats }
      | null;
    setPending(false);
    const user = data?.user;
    if (user) setState((prev) => (prev ? { ...prev, user } : prev));
    if (!response.ok) {
      setError(data?.error ?? "Chưa nhận được lượt.");
      return;
    }
    setCreditOpen(false);
  }

  if (!state) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink px-6 text-sm text-zinc-400">
        {error || "Đang mở bài luyện..."}
      </main>
    );
  }

  function renderSentence(sentence: PracticeSentence) {
    const active = sentence.status === "current";
    const done = sentence.status === "done";
    const selected = reviewed?.id === sentence.id;
    if (sentence.status === "locked") {
      return (
        <div className="rounded-xl border border-dashed border-white/10 px-3 py-2.5">
          <p className="mb-0.5 text-[11px] text-zinc-600">Câu {sentence.order} · Chưa tới</p>
          <p className="text-sm leading-6 text-zinc-500">{sentence.vietnameseHint}</p>
        </div>
      );
    }

    if (active) {
      const typed = draft.trim().length > 0;
      return (
        <article
          key={sentence.id}
          ref={currentRef}
          onClick={() => {
            setReviewId(null);
            textareaRef.current?.focus();
          }}
          className={`cursor-text rounded-xl bg-[#3a3114] px-3 py-3 transition-shadow ${
            inputFocused
              ? "ring-2 ring-[#f0c14b] shadow-[0_0_24px_-8px_#f0c14b]"
              : "ring-1 ring-[#f0c14b]/60"
          }`}
        >
          <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-2">
              Câu {sentence.order}
              {inputFocused && <span className="text-[#f0c14b]">✎ Đang viết</span>}
            </span>
            <span className={wordCount > 0 && wordCount < 8 ? "text-amber-400" : ""}>
              {wordCount} từ
            </span>
          </div>
          {typed ? (
            <>
              <p className="font-serif text-base leading-7 md:text-lg">{draft}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {sentence.vietnameseHint}
              </p>
            </>
          ) : (
            <>
              <p className="text-base leading-7 text-white md:text-lg">
                {sentence.vietnameseHint}
              </p>
              <div className="mt-3 h-px border-t border-dashed border-[#f0c14b]/40" />
            </>
          )}
        </article>
      );
    }

    return (
      <article
        key={sentence.id}
        onClick={() => {
          setReviewId(sentence.id);
          if (isMobile()) setSheet("feedback");
          else
            document
              .getElementById("feedback")
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }}
        title="Bấm để xem lại góp ý của câu này"
        className={`cursor-pointer rounded-xl px-3 py-3 ${
          selected
            ? "bg-sky-500/10 ring-1 ring-sky-400/70"
            : "bg-white/[0.03] hover:bg-white/[0.07]"
        }`}
      >
        <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Câu {sentence.order}</span>
          {done && sentence.accuracy !== null && (
            <span>{sentence.accuracy.toFixed(0)}%</span>
          )}
        </div>
        <p className="font-serif text-base leading-7 md:text-lg">{sentence.englishText}</p>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{sentence.vietnameseHint}</p>
      </article>
    );
  }
  const feedbackContent = (
    <>
    {selected && (
      <div className="border-b border-white/10 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Góp ý · Câu {selected.order}</h2>
          {pending ? null : reviewed ? (
            <span className="text-xs font-medium text-emerald-300">
              ✓ Đạt
              {reviewed.feedback && reviewed.feedback.pointsAwarded > 0 &&
                ` · +${reviewed.feedback.pointsAwarded} điểm`}
            </span>
          ) : feedback ? (
            <span className="text-xs font-medium text-rose-300">Chưa đạt · viết lại</span>
          ) : (
            <span className="text-xs text-zinc-500">Chưa nộp</span>
          )}
        </div>
        {state.completed && reviewed && (
          <p className="mt-1 text-[11px] text-zinc-500">
            Bạn đã hoàn thành bài. Đọc góp ý rồi bấm “Xem tổng kết”.
          </p>
        )}
      </div>
    )}

    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Độ chính xác
      </h2>
      <p
        className={`mt-1 flex items-center gap-2 font-serif text-3xl font-semibold ${
          !feedback
            ? "text-zinc-600"
            : feedback.accuracy >= 98
              ? "text-emerald-300"
              : feedback.accuracy >= 70
                ? "text-[#f0c14b]"
                : "text-rose-300"
        }`}
      >
        {pending ? (
          <Spinner />
        ) : feedback ? (
          `${feedback.accuracy.toFixed(2)}%`
        ) : (
          "—"
        )}
      </p>
      {pending && (
        <p className="mt-1 text-[11px] text-zinc-500">
          Đang chấm... {(elapsedMs / 1000).toFixed(1)}s
        </p>
      )}
      {!pending && feedback && (
        <p className="mt-1 text-[11px] text-zinc-500">
          {feedback.aiMode === "demo"
            ? "Đang chấm mẫu. Thêm API key để giáo viên AI chấm."
            : selected?.id === gradedId
              ? "Giáo viên AI vừa chấm câu này."
              : "Kết quả lần nộp đạt của câu này."}
          {selected?.id === gradedId &&
            lastDurationMs !== null &&
            ` · ${(lastDurationMs / 1000).toFixed(1)}s`}
        </p>
      )}
    </section>

    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Gợi ý cải thiện
      </h2>
      {feedback?.isPerfect ? (
        <p className="mt-2 text-sm font-medium text-emerald-300">✓ Good translation!</p>
      ) : feedback && feedback.suggestedImprovements.length > 0 ? (
        <ul className="mt-2 space-y-3">
          {feedback.suggestedImprovements.map((item) => (
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
        {feedback?.comment ?? "Nhận xét sẽ hiện bằng tiếng Việt ngay sau khi nộp."}
      </p>
    </section>
    </>
  );

  return (
    <main className="flex h-dvh flex-col bg-ink text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 md:px-5">
        <div className="min-w-0">
          <p className="whitespace-nowrap text-sm font-semibold tracking-[0.16em]">
            <span className="hidden sm:inline">IELTS </span>TASK 2
          </p>
          <p className="truncate text-[11px] text-zinc-500">{state.essay.title}</p>
        </div>
        <div className="relative flex gap-1.5">
          <StatChip label="Lượt" value={state.user.credits} alert={state.user.credits === 0} />
          <StatChip label="Điểm" value={state.user.points} />
          <StatChip
            label="Tiến độ"
            value={`${state.progress.done}/${state.progress.total}`}
          />
          <button
            type="button"
            onClick={() => setAchievementsOpen((open) => !open)}
            aria-label="Thành tích hôm nay"
            aria-expanded={achievementsOpen}
            className={`relative rounded-lg px-2.5 text-lg ${
              achievementsOpen ? "bg-white/20" : "bg-white/10 hover:bg-white/15"
            }`}
          >
            🏆
            {state.user.achievements.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f0c14b] px-1 text-[10px] font-bold text-[#1c1403]">
                {state.user.achievements.length}
              </span>
            )}
          </button>

          {achievementsOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setAchievementsOpen(false)} />
              <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl bg-[#16161a] p-3 shadow-xl ring-1 ring-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Thành tích hôm nay
                </p>
                {state.user.achievements.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-400">Viết một câu đạt để mở huy hiệu.</p>
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
              </div>
            </>
          )}
        </div>
      </header>

      <div className="shrink-0 border-b border-white/10 px-4 py-3 md:px-6 lg:py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f0c14b]">
            {state.essay.topic} · {state.essay.difficulty}
          </p>
          <button
            type="button"
            onClick={() => setPromptOpen((open) => !open)}
            aria-expanded={promptOpen}
            className="text-[11px] text-zinc-400 lg:hidden"
          >
            {promptOpen ? "Thu gọn ▴" : "Xem đề ▾"}
          </button>
        </div>
        <h1
          className={`mt-1.5 max-w-4xl font-serif text-base font-semibold leading-snug md:text-xl lg:mt-2 lg:line-clamp-none lg:text-2xl ${
            promptOpen ? "" : "line-clamp-2"
          }`}
        >
          {state.essay.prompt}
        </h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5">
          {state.sentences.map((sentence, index) => (
            <div key={sentence.id} className="flex gap-3">
              <StepRail
                status={sentence.status}
                last={index === state.sentences.length - 1}
              />
              <div className="min-w-0 flex-1 pb-2">{renderSentence(sentence)}</div>
            </div>
          ))}
        </section>

        <aside
          id="feedback"
          className="hidden w-[340px] shrink-0 space-y-4 overflow-y-auto border-l border-white/10 px-4 py-4 lg:block"
        >
          <DictionaryPanel />

          {feedbackContent}
        </aside>
      </div>

      <form
        onSubmit={submit}
        className="shrink-0 border-t border-white/10 bg-[#09090b] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5"
      >
        {error && <p className="mb-2 text-sm text-rose-300">{error}</p>}
        {(selected || pending) && (
          <button
            type="button"
            onClick={() => setSheet("feedback")}
            disabled={pending}
            className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-left text-sm ring-1 ring-white/10 lg:hidden"
          >
            {pending ? (
              <span className="flex items-center gap-2 text-zinc-300">
                <Spinner />
                Đang chấm... {(elapsedMs / 1000).toFixed(1)}s
              </span>
            ) : (
              <>
                <span className="truncate">
                  <span className="font-semibold">Góp ý · Câu {selected?.order}</span>
                  {reviewed ? (
                    <span className="text-emerald-300">
                      {" "}
                      ✓ {feedback ? `${feedback.accuracy.toFixed(0)}%` : "Đạt"}
                    </span>
                  ) : feedback ? (
                    <span className="text-rose-300"> · Chưa đạt {feedback.accuracy.toFixed(0)}%</span>
                  ) : (
                    <span className="text-zinc-500"> · Chưa nộp</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-zinc-400">Xem ▴</span>
              </>
            )}
          </button>
        )}
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
          ref={textareaRef}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (event.target.value.trim()) setReviewId(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }}
          enterKeyHint="send"
          rows={2}
          disabled={!current}
          placeholder={
            current ? "Viết một câu tiếng Anh cho ý đang được tô vàng" : "Bạn đã viết xong cả bài."
          }
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
            onClick={() => setSheet("dictionary")}
            aria-label="Từ điển"
            className="rounded-xl bg-white/10 px-3 py-3 text-base lg:hidden"
          >
            📖
          </button>
          {state.completed ? (
            <button
              ref={summaryButtonRef}
              type="button"
              onClick={() => router.push(`/summary/${state.attemptId}`)}
              className="flex-1 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-emerald-950"
            >
              Xem tổng kết →
            </button>
          ) : (
            <>
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f0c14b] px-4 py-3 text-sm font-semibold text-[#1c1403] disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Spinner className="border-[#1c1403]/20 border-t-[#1c1403]" />
                    Đang chấm... {(elapsedMs / 1000).toFixed(1)}s
                  </>
                ) : (
                  "Nộp · trừ 1 lượt"
                )}
              </button>
            </>
          )}
        </div>
      </form>

      {sheet === "feedback" && (
        <BottomSheet title="Góp ý" showTitle={false} onClose={closeSheet}>
          {feedbackContent}
        </BottomSheet>
      )}
      {sheet === "dictionary" && (
        <BottomSheet title="Từ điển" onClose={closeSheet}>
          <DictionaryPanel />
        </BottomSheet>
      )}

      {newAchievements.length > 0 && (
        <div
          role="status"
          className="toast-in fixed inset-x-0 top-14 z-30 mx-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-[#3a3114] px-4 py-3 shadow-xl ring-1 ring-[#f0c14b]/60"
        >
          {newAchievements.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-sm font-semibold text-[#f0c14b]">Huy hiệu mới: {item.title}</p>
                <p className="text-xs text-zinc-300">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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
