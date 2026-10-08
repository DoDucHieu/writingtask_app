import type { Submission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseBreakdown, parseErrors, parseImprovements, parseStringArray } from "@/lib/json";
import { presentUser } from "@/lib/user-stats";
import type { BlockReason, Feedback, PracticeState } from "@/lib/types";

function latestSubmission(submissions: Submission[], sentenceId?: string) {
  const pool = sentenceId
    ? submissions.filter((item) => item.sentenceId === sentenceId)
    : submissions;
  return pool.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

/**
 * Nộp lại miễn phí một lần khi lần nộp gần nhất của câu bị chặn chỉ vì ngữ pháp
 * và đã trừ token. Lần miễn phí đó mà vẫn sai thì lần sau trừ token như thường.
 */
export function isFreeRetry(submissions: Submission[], sentenceId: string) {
  const latest = latestSubmission(submissions, sentenceId);
  return latest?.blockReason === "grammar" && latest.creditCost > 0;
}

function toBlockReason(value: string | null): BlockReason | null {
  return value === "score" || value === "meaning" || value === "grammar" ? value : null;
}

function toFeedback(submission: Submission | null): Feedback | null {
  if (!submission) return null;
  const mode = submission.aiMode;
  return {
    accuracy: submission.accuracy,
    errors: parseErrors(submission.errors),
    blockReason: toBlockReason(submission.blockReason),
    breakdown: parseBreakdown(submission.scoreBreakdown),
    suggestedImprovements: submission.isPerfect
      ? []
      : parseImprovements(submission.suggestedImprovements),
    comment: submission.comment,
    isPerfect: submission.isPerfect,
    englishText: submission.englishText,
    aiMode: mode === "gemini" || mode === "openai" ? mode : "demo",
    pointsAwarded: submission.pointsAwarded,
  };
}

/** Câu tham chiếu chỉ ở trên server. Client chỉ nhận gợi ý tiếng Việt và từ khóa. */
export async function buildPracticeState(
  userId: string,
  essaySlug: string,
  preferAttemptId?: string,
): Promise<PracticeState | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const essay = await prisma.essay.findUnique({
    where: { slug: essaySlug },
    include: { sentences: { orderBy: { order: "asc" } } },
  });
  if (!user || !essay) return null;

  let attempt = preferAttemptId
    ? await prisma.attempt.findFirst({
        where: { id: preferAttemptId, userId, essaySlug },
        include: { submissions: true },
      })
    : null;

  if (!attempt) {
    attempt = await prisma.attempt.findFirst({
      where: { userId, essaySlug, status: "in_progress" },
      include: { submissions: true },
    });
  }

  if (!attempt) {
    const created = await prisma.attempt.create({
      data: { userId, essaySlug, status: "in_progress" },
    });
    attempt = { ...created, submissions: [] };
  }

  let currentAssigned = false;
  const sentences = essay.sentences.map((sentence) => {
    const accepted = attempt.submissions.find(
      (item) => item.sentenceId === sentence.id && item.advanced,
    );
    let status: "done" | "current" | "locked";
    if (accepted) {
      status = "done";
    } else if (!currentAssigned) {
      status = "current";
      currentAssigned = true;
    } else {
      status = "locked";
    }
    const shown = accepted ?? (status === "current" ? latestSubmission(attempt.submissions, sentence.id) : null);
    return {
      id: sentence.id,
      order: sentence.order,
      vietnameseHint: sentence.vietnameseHint,
      keywords: parseStringArray(sentence.keywords),
      structureTip: sentence.structureTip,
      status,
      englishText: shown?.englishText ?? null,
      accuracy: accepted?.accuracy ?? null,
      feedback: accepted ? toFeedback(accepted) : null,
    };
  });

  const done = sentences.filter((sentence) => sentence.status === "done").length;
  // Chỉ hiện góp ý của câu đang làm (các lần chưa đạt). Câu đã đạt xem lại qua `sentences[].feedback`.
  const currentSentence = sentences.find((sentence) => sentence.status === "current");
  return {
    user: await presentUser(user),
    essay: {
      slug: essay.slug,
      title: essay.title,
      prompt: essay.prompt,
      topic: essay.topic,
      difficulty: essay.difficulty,
    },
    sentences,
    progress: { done, total: sentences.length },
    feedback: currentSentence
      ? toFeedback(latestSubmission(attempt.submissions, currentSentence.id))
      : null,
    freeRetry: currentSentence ? isFreeRetry(attempt.submissions, currentSentence.id) : false,
    attemptId: attempt.id,
    completed: attempt.status === "completed",
  };
}
