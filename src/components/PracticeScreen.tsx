"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { StatChip } from "@/components/StatChip";
import { Spinner } from "@/components/Spinner";
import { StepRail } from "@/components/StepRail";
import { BottomSheet } from "@/components/BottomSheet";
import {
  AlertIcon,
  BulbIcon,
  ChatIcon,
  CheckCircleIcon,
  ProgressIcon,
  SparkleIcon,
  StarIcon,
  TokenIcon,
  XCircleIcon,
} from "@/components/icons";
import { CRITERION_ICONS, ScoreRing, SectionTitle } from "@/components/FeedbackParts";
import { beginRoute } from "@/components/RouteProgress";
import { Bone } from "@/components/Skeleton";
import { SCORE_CRITERIA } from "@/lib/grading";
import type {
  Achievement,
  BlockReason,
  PracticeSentence,
  PracticeState,
  UserStats,
} from "@/lib/types";

const VIEW_KEY = "wt2-practice-view";
type PracticeView = "cards" | "paragraph";

function blockLabel(reason: BlockReason | null) {
  if (reason === "grammar") return "Đúng ý nhưng còn lỗi ngữ pháp · sửa rồi nộp lại";
  if (reason === "meaning") return "Chưa đủ ý · viết lại";
  return "Chưa đạt · viết lại";
}

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
  const [listScrolled, setListScrolled] = useState(false);
  const [dictOpen, setDictOpen] = useState(false);
  const dictPanelRef = useRef<HTMLDivElement>(null);

  // Ctrl/Cmd+K mở hoặc đóng từ điển (desktop), Esc để đóng.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (window.matchMedia("(max-width: 1023px)").matches) return;
        event.preventDefault();
        setDictOpen((open) => !open);
      } else if (event.key === "Escape") {
        setDictOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (dictOpen) dictPanelRef.current?.querySelector("input")?.focus();
  }, [dictOpen]);
  const [viewMode, setViewMode] = useState<PracticeView>("cards");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentRef = useRef<HTMLElement>(null);
  const summaryButtonRef = useRef<HTMLButtonElement>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const refocusOnCloseRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "cards" || saved === "paragraph") setViewMode(saved);
  }, []);

  // Đổi chế độ xem thì giữ câu đang làm ở đầu danh sách. Chạy trước khi trình duyệt vẽ
  // nên không thấy nội dung nhảy về đầu rồi trượt lại.
  useLayoutEffect(() => {
    currentRef.current?.scrollIntoView({ block: "start" });
  }, [viewMode]);

  function chooseView(next: PracticeView) {
    setViewMode(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  useEffect(() => {
    if (!confirmQuit) return;
    stayButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmQuit(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmQuit]);

  useEffect(() => {
    let active = true;
    fetch(`/api/practice/${essayId}`)
      .then(async (response) => {
        if (response.status === 401) {
          beginRoute();
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
  const breakdown = feedback?.breakdown ?? null;
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
    if (state.user.credits < 1 && !state.freeRetry) {
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
      setError(data?.error ?? "Chưa nhận được token.");
      return;
    }
    setCreditOpen(false);
  }

  if (!state) {
    if (error) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-ink px-6 text-sm text-zinc-400">
          {error}
        </main>
      );
    }
    return (
      <main className="flex h-dvh flex-col bg-ink text-fg" aria-busy="true">
        <p className="sr-only">Đang mở bài luyện</p>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 md:px-5">
          <div className="min-w-0">
            <Bone className="h-4 w-24" />
            <Bone className="mt-2 h-3 w-40" />
          </div>
          <div className="flex gap-1.5">
            <Bone className="h-9 w-16 rounded-lg" />
            <Bone className="h-9 w-16 rounded-lg" />
            <Bone className="h-9 w-16 rounded-lg" />
          </div>
        </header>
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 overflow-hidden px-4 py-5">
          {[0, 1, 2, 3].map((item) => (
            <Bone key={item} className="h-14 w-full rounded-xl" />
          ))}
        </div>
        <div className="shrink-0 border-t border-white/10 px-4 py-3">
          <Bone className="h-16 w-full rounded-xl" />
          <div className="mt-2 flex gap-2">
            <Bone className="h-11 w-20 rounded-xl" />
            <Bone className="h-11 w-20 rounded-xl" />
            <Bone className="h-11 flex-1 rounded-xl" />
          </div>
        </div>
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
          className={`scroll-mt-14 cursor-text rounded-xl bg-gold-soft px-3 py-3 transition-shadow ${
            inputFocused
              ? "ring-2 ring-gold shadow-[0_0_24px_-8px_var(--color-gold)]"
              : "ring-1 ring-gold/60"
          }`}
        >
          <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-2">
              Câu {sentence.order}
              {inputFocused && <span className="text-gold">✎ Đang viết</span>}
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
              <p className="text-base leading-7 text-fg md:text-lg">
                {sentence.vietnameseHint}
              </p>
              <div className="mt-3 h-px border-t border-dashed border-gold/40" />
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

  function openReview(sentence: PracticeSentence) {
    setReviewId(sentence.id);
    if (isMobile()) setSheet("feedback");
    else document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function focusCurrent() {
    setReviewId(null);
    textareaRef.current?.focus();
  }

  function renderParagraph() {
    if (!state) return null;
    return (
      <p className="font-serif text-lg leading-8 md:text-xl">
        {state.sentences.map((sentence) => {
          const done = sentence.status === "done";
          const active = sentence.status === "current";
          const selected = reviewed?.id === sentence.id;
          return (
            <span key={sentence.id}>
              <span
                ref={active ? currentRef : undefined}
                role={done || active ? "button" : undefined}
                tabIndex={done || active ? 0 : undefined}
                title={
                  done
                    ? "Bấm để xem lại góp ý của câu này"
                    : active
                      ? "Bấm để viết câu này"
                      : undefined
                }
                onClick={
                  done
                    ? () => openReview(sentence)
                    : active
                      ? () => focusCurrent()
                      : undefined
                }
                onKeyDown={
                  done || active
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          if (done) openReview(sentence);
                          else focusCurrent();
                        }
                      }
                    : undefined
                }
                className={`scroll-mt-14 underline-offset-4 transition-colors duration-300 focus-visible:underline focus-visible:outline-none ${
                  active
                    ? "cursor-text text-gold"
                    : done
                      ? selected
                        ? "cursor-pointer text-sky-300"
                        : "cursor-pointer text-fg hover:text-sky-200"
                      : "text-zinc-500"
                }`}
              >
                {done ? sentence.englishText : sentence.vietnameseHint}
              </span>{" "}
            </span>
          );
        })}
      </p>
    );
  }

  // Góp ý của câu đang làm luôn là lần nộp chưa đạt (câu đạt thì đã sang câu sau).
  // Không dựa vào blockReason vì bài nộp cũ trước khi có luật chấm mới không lưu trường này.
  const failed = !reviewed && feedback !== null;
  const scoreTone: "success" | "gold" | "danger" | "muted" = !feedback
    ? "muted"
    : failed
      ? "danger"
      : feedback.accuracy >= 98
        ? "success"
        : feedback.accuracy >= 70
          ? "gold"
          : "danger";
  const scoreText = {
    success: "text-emerald-300",
    gold: "text-gold",
    danger: "text-danger",
    muted: "text-zinc-500",
  }[scoreTone];
  const verdict = !feedback
    ? "Chưa có kết quả"
    : failed
      ? "Cần viết lại"
      : feedback.accuracy >= 98
        ? "Xuất sắc"
        : feedback.accuracy >= 85
          ? "Tốt"
          : "Đạt";

  const feedbackContent = (
    <>
      {selected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="whitespace-nowrap text-sm font-semibold">Góp ý · Câu {selected.order}</h2>
            {pending ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
                <Spinner />
                Đang chấm
              </span>
            ) : reviewed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                Đạt
                {reviewed.feedback && reviewed.feedback.pointsAwarded > 0 && (
                  <span className="text-emerald-200/80">· +{reviewed.feedback.pointsAwarded} điểm</span>
                )}
              </span>
            ) : feedback ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-medium text-danger ring-1 ring-danger/20">
                <XCircleIcon className="h-3.5 w-3.5" />
                Chưa đạt
              </span>
            ) : (
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400">Chưa nộp</span>
            )}
          </div>
          {!pending && !reviewed && feedback?.blockReason && (
            <p className="text-xs leading-5 text-zinc-400">{blockLabel(feedback.blockReason)}</p>
          )}
          {!pending && !reviewed && state.freeRetry && (
            <p className="flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-300">
              <SparkleIcon className="h-3.5 w-3.5 shrink-0" />
              Chỉ còn lỗi ngữ pháp: lần nộp lại câu này không trừ token.
            </p>
          )}
          {state.completed && reviewed && (
            <p className="text-[11px] text-zinc-500">Bạn đã hoàn thành bài. Đọc góp ý rồi bấm “Xem tổng kết”.</p>
          )}
        </div>
      )}

      <section className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
        <div className="flex items-center gap-4">
          <ScoreRing value={pending ? 0 : (feedback?.accuracy ?? 0)} tone={pending ? "muted" : scoreTone}>
            {pending ? (
              <Spinner />
            ) : feedback ? (
              <span className={`text-lg font-bold tabular-nums ${scoreText}`}>
                {Math.round(feedback.accuracy)}
                <span className="text-[10px] font-semibold">%</span>
              </span>
            ) : (
              <span className="text-lg text-zinc-600">—</span>
            )}
          </ScoreRing>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Độ chính xác</p>
            <p className={`mt-0.5 text-base font-semibold ${pending ? "text-zinc-300" : scoreText}`}>
              {pending ? `Đang chấm… ${(elapsedMs / 1000).toFixed(1)}s` : verdict}
            </p>
            {!pending && feedback && (
              <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                {feedback.aiMode === "demo"
                  ? "Đang chấm mẫu. Thêm API key để giáo viên AI chấm."
                  : selected?.id === gradedId
                    ? "Giáo viên AI vừa chấm câu này."
                    : reviewed
                      ? "Kết quả lần nộp đạt của câu này."
                      : "Kết quả lần nộp gần nhất của câu này."}
                {selected?.id === gradedId &&
                  lastDurationMs !== null &&
                  ` · ${(lastDurationMs / 1000).toFixed(1)}s`}
              </p>
            )}
          </div>
        </div>
        {!pending && breakdown && (
          <ul className="mt-4 space-y-2.5 border-t border-white/5 pt-3">
            {SCORE_CRITERIA.map((criterion) => {
              const score = breakdown[criterion.key];
              const ratio = score / criterion.max;
              const CriterionIcon = CRITERION_ICONS[criterion.key];
              // Tiêu chí làm câu bị chặn luôn tô đỏ, dù điểm số vẫn cao.
              const color =
                feedback?.blockReason === criterion.key
                  ? "danger"
                  : ratio >= 0.95
                    ? "emerald"
                    : ratio >= 0.7
                      ? "gold"
                      : "danger";
              return (
                <li key={criterion.key} className="flex items-center gap-2.5">
                  <CriterionIcon
                    className={`h-4 w-4 shrink-0 ${
                      color === "emerald" ? "text-emerald-300" : color === "gold" ? "text-gold" : "text-danger"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-zinc-300">{criterion.label}</span>
                      <span className="tabular-nums text-zinc-300">
                        {score}
                        <span className="text-zinc-600">/{criterion.max}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                          color === "emerald" ? "bg-emerald-400" : color === "gold" ? "bg-gold" : "bg-danger"
                        }`}
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pending ? (
        <div className="space-y-2.5 px-1" aria-hidden="true">
          <Bone className="h-3 w-24" />
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-5/6" />
          <Bone className="h-3 w-2/3" />
        </div>
      ) : !feedback ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-zinc-400">
            <ChatIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-zinc-300">Chưa có góp ý</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Viết câu tiếng Anh rồi bấm Nộp. Lỗi cần sửa, nhận xét và gợi ý viết hay hơn sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <>
          {feedback.errors.length > 0 && (
            <section className="space-y-2">
              <SectionTitle icon={AlertIcon} tone="danger">
                Lỗi cần sửa
                <span className="rounded-full bg-danger/15 px-1.5 text-[10px] font-semibold text-danger">
                  {feedback.errors.length}
                </span>
              </SectionTitle>
              <ul className="space-y-1.5">
                {feedback.errors.map((item, index) => {
                  const ErrorIcon = CRITERION_ICONS[item.criterion];
                  const isGrammar = item.criterion === "grammar";
                  return (
                    <li
                      key={`${item.criterion}-${index}`}
                      className={`flex gap-2.5 rounded-xl px-3 py-2 text-sm leading-6 ${
                        isGrammar ? "bg-danger/10 ring-1 ring-danger/20" : "bg-white/[0.04]"
                      }`}
                    >
                      <ErrorIcon className={`mt-1 h-4 w-4 shrink-0 ${isGrammar ? "text-danger" : "text-zinc-400"}`} />
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold ${isGrammar ? "text-danger" : "text-zinc-400"}`}>
                          {SCORE_CRITERIA.find((criterion) => criterion.key === item.criterion)?.label}
                        </p>
                        <p className="text-zinc-200">{item.issue}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <SectionTitle icon={ChatIcon} tone="sky">
              Nhận xét
            </SectionTitle>
            <p className="rounded-xl border-l-2 border-sky-400/50 bg-white/[0.03] px-3 py-2.5 text-sm leading-6 text-zinc-200">
              {feedback.comment}
            </p>
          </section>

          <section className="space-y-2">
            <SectionTitle icon={BulbIcon} tone="gold">
              Gợi ý cải thiện
            </SectionTitle>
            {feedback.isPerfect ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-400/10 px-3 py-3 ring-1 ring-emerald-400/20">
                <CheckCircleIcon className="h-6 w-6 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Good translation!</p>
                  <p className="text-xs text-zinc-400">Câu đã chuẩn, không cần sửa gì thêm.</p>
                </div>
              </div>
            ) : feedback.suggestedImprovements.length > 0 ? (
              <ol className="space-y-2.5">
                {feedback.suggestedImprovements.map((item, index) => (
                  <li
                    key={item.title + item.explanation}
                    className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/5"
                  >
                    <p className="flex items-start gap-2 text-sm font-semibold">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15 text-[11px] text-gold">
                        {index + 1}
                      </span>
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-zinc-300">{item.explanation}</p>
                    {item.example && (
                      <div className="mt-2.5 rounded-lg bg-gold/[0.06] px-3 py-2 ring-1 ring-gold/15">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gold/80">
                          <SparkleIcon className="h-3 w-3" />
                          Viết lại hay hơn
                        </p>
                        <p className="mt-1 font-serif text-sm leading-6 text-gold">{item.example}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-zinc-500">Không có gợi ý thêm cho câu này.</p>
            )}
          </section>
        </>
      )}
    </>
  );

  return (
    <main className="flex h-dvh flex-col bg-ink text-fg">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmQuit(true)}
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200 lg:inline-flex"
          >
            <span aria-hidden="true">←</span> Danh sách đề
          </button>
          <span className="hidden h-6 w-px bg-white/10 lg:block" aria-hidden="true" />
        <div className="min-w-0">
          <p className="whitespace-nowrap text-sm font-semibold tracking-[0.16em]">
            <span className="hidden sm:inline">IELTS </span>TASK 2
          </p>
          <p className="truncate text-[11px] text-zinc-500">{state.essay.title}</p>
        </div>
        </div>
        <div className="relative flex gap-1.5">
          <StatChip
            label="Token"
            value={state.user.credits}
            icon={<TokenIcon className="h-4 w-4" />}
            alert={state.user.credits === 0}
          />
          <StatChip label="Điểm" value={state.user.points} icon={<StarIcon className="h-4 w-4" />} />
          <StatChip
            label="Tiến độ"
            icon={<ProgressIcon className="h-4 w-4" />}
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
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-ink">
                {state.user.achievements.length}
              </span>
            )}
          </button>

          {achievementsOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setAchievementsOpen(false)} />
              <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl bg-surface-2 p-3 shadow-xl ring-1 ring-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Thành tích hôm nay
                </p>
                {state.user.achievements.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-400">Viết một câu đạt để mở huy hiệu.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {state.user.achievements.map((item) => (
                      <li key={item.title} className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-sm font-medium text-gold">{item.title}</p>
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

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 md:px-6">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="whitespace-nowrap rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">
                {state.essay.topic}
              </span>
              <span className="whitespace-nowrap rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
                {state.essay.difficulty}
              </span>
            </div>
            <div className="mt-2 flex items-start gap-2">
              <h1
                className={`min-w-0 flex-1 max-w-3xl font-serif text-base font-semibold leading-snug md:text-lg lg:line-clamp-none ${
                  promptOpen ? "" : "line-clamp-2"
                }`}
              >
                {state.essay.prompt}
              </h1>
              <button
                type="button"
                onClick={() => setPromptOpen((open) => !open)}
                aria-expanded={promptOpen}
                aria-label={promptOpen ? "Thu gọn đề bài" : "Xem toàn bộ đề bài"}
                className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-sm text-zinc-400 hover:bg-white/5 lg:hidden"
              >
                {promptOpen ? "▴" : "▾"}
              </button>
            </div>
          </div>

          <section
            className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable] md:px-5"
            onScroll={(event) => setListScrolled(event.currentTarget.scrollTop > 4)}
          >
            <div
              className={`sticky top-0 z-10 -mx-3 mb-2 bg-ink px-3 py-2 md:-mx-5 md:px-5 ${
                listScrolled ? "shadow-[0_8px_12px_-6px_rgba(0,0,0,0.6)]" : ""
              }`}
            >
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:inline">
                    Bài viết
                  </span>
                  <div className="flex items-center gap-1" aria-hidden="true">
                    {state.sentences.map((sentence) => (
                      <span
                        key={sentence.id}
                        className={`h-1.5 w-3 rounded-full transition-colors duration-300 sm:w-5 ${
                          sentence.status === "done"
                            ? "bg-emerald-400"
                            : sentence.status === "current"
                              ? "bg-gold"
                              : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="whitespace-nowrap text-xs tabular-nums text-zinc-400">
                    <span className="font-semibold text-fg">{state.progress.done}</span>/{state.progress.total}
                    <span className="sr-only"> câu đã xong</span>
                  </span>
                </div>
                <div
                  role="group"
                  aria-label="Cách hiển thị"
                  className="relative grid shrink-0 grid-cols-2 rounded-lg bg-white/5 p-0.5 text-xs ring-1 ring-white/5"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-surface-2 shadow-sm ring-1 ring-white/10 transition-transform duration-200 ease-out ${
                      viewMode === "paragraph" ? "translate-x-full" : ""
                    }`}
                  />
                  {(
                    [
                      ["cards", "Từng câu"],
                      ["paragraph", "Đoạn văn"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={viewMode === mode}
                      onClick={() => chooseView(mode)}
                      className={`relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 transition-colors ${
                        viewMode === mode ? "font-medium text-fg" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        {mode === "cards" ? (
                          <>
                            <rect x="3" y="4" width="18" height="6" rx="1.5" />
                            <rect x="3" y="14" width="18" height="6" rx="1.5" />
                          </>
                        ) : (
                          <path d="M4 6h16M4 10h16M4 14h16M4 18h10" />
                        )}
                      </svg>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {viewMode === "paragraph" ? (
              <div className="mx-auto max-w-3xl py-2">{renderParagraph()}</div>
            ) : (
              <div className="mx-auto max-w-3xl">
                {state.sentences.map((sentence, index) => (
                  <div key={sentence.id} className="flex gap-3">
                    <StepRail
                      status={sentence.status}
                      last={index === state.sentences.length - 1}
                    />
                    <div className="min-w-0 flex-1 pb-2">{renderSentence(sentence)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <div className="relative shrink-0">
          {dictOpen && (
            <div className="fixed inset-0 z-20 hidden lg:block" onClick={() => setDictOpen(false)} />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-full z-30 mb-2 px-5">
          <div
            ref={dictPanelRef}
            role="dialog"
            aria-label="Từ điển"
            className={`mx-auto max-w-3xl ${dictOpen ? "hidden lg:block" : "hidden"}`}
          >
          <div className="pointer-events-auto max-h-[60vh] w-[420px] overflow-y-auto rounded-2xl bg-surface-2 p-4 shadow-2xl ring-1 ring-white/10">
            <div className="mb-1 flex justify-end">
              <span className="mr-auto text-[11px] text-zinc-500">Ctrl+K để mở/đóng · Esc để đóng</span>
              <button
                type="button"
                onClick={() => setDictOpen(false)}
                aria-label="Đóng từ điển"
                className="rounded-md px-1.5 text-sm text-zinc-400 hover:bg-white/5"
              >
                ✕
              </button>
            </div>
            <DictionaryPanel />
          </div>
          </div>
          </div>
          <form
            onSubmit={submit}
            className="shrink-0 overflow-hidden border-t border-white/10 bg-ink px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-gutter:stable] md:px-5"
          >
            <div className="lg:mx-auto lg:max-w-3xl">
            {error && <p className="mb-2 text-sm text-danger">{error}</p>}
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
                        <span className="text-danger">
                          {" "}
                          · {feedback.blockReason === "grammar"
                            ? "Còn lỗi ngữ pháp"
                            : `Chưa đạt ${feedback.accuracy.toFixed(0)}%`}
                        </span>
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
              <div id="sentence-hint" className="mb-3 rounded-xl bg-hint px-3 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sky-200">Gợi ý câu {current.order}</p>
                  <button
                    type="button"
                    onClick={() => setHintOpen(false)}
                    aria-label="Đóng gợi ý"
                    title="Đóng gợi ý"
                    className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sky-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
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
            <div className="lg:rounded-2xl lg:border lg:border-white/10 lg:bg-white/5 lg:ring-gold lg:focus-within:ring-2">
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
              className="block w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-serif text-base outline-none ring-gold focus:ring-2 lg:rounded-2xl lg:border-0 lg:bg-transparent lg:px-4 lg:focus:ring-0"
            />
            <div className="mt-2 flex gap-2 lg:mt-0 lg:items-center lg:gap-1 lg:px-2 lg:pb-2">
              <button
                type="button"
                onClick={() => setConfirmQuit(true)}
                className="rounded-xl bg-zinc-700 px-4 py-3 text-sm font-medium lg:hidden"
              >
                Thoát
              </button>
              <button
                type="button"
                onClick={() => (isMobile() ? setSheet("dictionary") : setDictOpen((open) => !open))}
                aria-label="Từ điển"
                aria-expanded={dictOpen}
                title="Từ điển (Ctrl+K)"
                className={`flex items-center gap-1.5 rounded-xl px-3 py-3 text-base lg:rounded-lg lg:px-2.5 lg:py-1.5 lg:text-sm ${
                  dictOpen ? "bg-white/20 lg:bg-white/10" : "bg-white/10 hover:bg-white/15 lg:bg-transparent lg:text-zinc-300 lg:hover:bg-white/10"
                }`}
              >
                📖<span className="hidden lg:inline">Từ điển</span>
              </button>
              {state.completed ? (
                <button
                  ref={summaryButtonRef}
                  type="button"
                  onClick={() => {
                    beginRoute();
                    router.push(`/summary/${state.attemptId}`);
                  }}
                  className="flex-1 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-emerald-950 lg:ml-auto lg:flex-none lg:py-2"
                >
                  Xem tổng kết →
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setHintOpen((open) => !open)}
                    aria-expanded={hintOpen}
                    aria-controls="sentence-hint"
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-medium lg:rounded-lg lg:px-2.5 lg:py-1.5 lg:font-normal lg:ring-0 ${
                      hintOpen
                        ? "bg-blue-900 text-sky-200 ring-1 ring-sky-400/60 lg:bg-white/10"
                        : "bg-blue-600 lg:bg-transparent lg:text-zinc-300 lg:hover:bg-white/10"
                    }`}
                  >
                    <span className="hidden lg:inline" aria-hidden="true">💡</span>
                    {hintOpen ? "Ẩn gợi ý" : "Gợi ý"}
                  </button>
                  <span className="ml-2 hidden whitespace-nowrap text-[11px] text-zinc-500 xl:inline">
                    Enter để nộp · Shift+Enter xuống dòng
                  </span>
                  <button
                    type="submit"
                    disabled={pending || !current}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-gold-ink disabled:opacity-60 lg:ml-auto lg:flex-none lg:rounded-lg lg:py-2"
                  >
                    {pending ? (
                      <>
                        <Spinner className="border-gold-ink/20 border-t-gold-ink" />
                        Đang chấm... {(elapsedMs / 1000).toFixed(1)}s
                      </>
                    ) : state.freeRetry ? (
                      "Nộp lại · miễn phí"
                    ) : (
                      <>
                        Nộp · trừ 1
                        <TokenIcon className="h-4 w-4" />
                        <span className="sr-only">token</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
            </div>
            </div>
          </form>
          </div>
        </div>

        <aside
          id="feedback"
          className="hidden w-[380px] shrink-0 space-y-4 overflow-y-auto border-l border-white/10 px-5 py-4 lg:block xl:w-[440px]"
        >
          {feedbackContent}
        </aside>
      </div>

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
          className="toast-in fixed inset-x-0 top-14 z-30 mx-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-gold-soft px-4 py-3 shadow-xl ring-1 ring-gold/60"
        >
          {newAchievements.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-sm font-semibold text-gold">Huy hiệu mới: {item.title}</p>
                <p className="text-xs text-zinc-300">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmQuit && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setConfirmQuit(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quit-title"
            className="w-full max-w-sm rounded-2xl bg-surface-2 p-5 ring-1 ring-white/10"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="quit-title" className="text-lg font-semibold">
              Thoát bài luyện?
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Tiến độ đã được lưu. Lần sau vào lại bài này, bạn viết tiếp từ câu đang dở.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                ref={stayButtonRef}
                type="button"
                onClick={() => setConfirmQuit(false)}
                className="flex-1 rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-gold-ink"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={() => {
                  beginRoute();
                  router.push("/essays");
                }}
                className="rounded-xl bg-white/10 px-3 py-2.5 text-sm"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {creditOpen && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-surface-2 p-5 ring-1 ring-white/10">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <TokenIcon className="h-5 w-5 text-gold" />
              Hết token
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Mỗi câu nộp tốn 1 token. Tài khoản mới có 20 token. Mỗi ngày bạn được nhận thêm 10
              token miễn phí. Gói trả phí sẽ gắn sau.
            </p>
            <div className="mt-4 flex gap-2">
              {state.user.canTopup ? (
                <button
                  type="button"
                  onClick={topup}
                  disabled={pending}
                  className="flex-1 rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-gold-ink"
                >
                  Nhận 10 token hôm nay
                </button>
              ) : (
                <p className="flex-1 text-sm text-zinc-400">Bạn đã nhận token miễn phí hôm nay.</p>
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
