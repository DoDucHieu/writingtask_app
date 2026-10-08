import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { gradeSentence } from "@/lib/ai";
import { nextStreak, todayVN } from "@/lib/dates";
import { parseStringArray } from "@/lib/json";
import { scoreOutcome } from "@/lib/grading";
import { prisma } from "@/lib/prisma";
import { buildPracticeState, isFreeRetry } from "@/lib/practice-state";

type Context = { params: Promise<{ essayId: string }> };

export async function POST(request: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < 8) {
    return NextResponse.json(
      { error: "Hãy viết một câu hoàn chỉnh, không chỉ vài từ." },
      { status: 400 },
    );
  }
  if (text.length > 500) {
    return NextResponse.json(
      { error: "Chỉ nộp một câu. Hãy rút ngắn lại dưới 500 ký tự." },
      { status: 400 },
    );
  }

  const { essayId } = await context.params;
  const essay = await prisma.essay.findUnique({
    where: { slug: essayId },
    include: { sentences: { orderBy: { order: "asc" } } },
  });
  if (!essay) {
    return NextResponse.json({ error: "Không tìm thấy đề." }, { status: 404 });
  }

  const attempt = await prisma.attempt.findFirst({
    where: { userId: user.id, essaySlug: essay.slug, status: "in_progress" },
    include: { submissions: true },
  });
  if (!attempt) {
    return NextResponse.json(
      { error: "Bài luyện chưa được mở. Hãy tải lại trang." },
      { status: 409 },
    );
  }

  const doneIds = new Set(
    attempt.submissions.filter((item) => item.advanced).map((item) => item.sentenceId),
  );
  const current = essay.sentences.find((sentence) => !doneIds.has(sentence.id));
  if (!current) {
    return NextResponse.json({ error: "Bạn đã hoàn thành bài này." }, { status: 409 });
  }

  const free = isFreeRetry(attempt.submissions, current.id);
  if (!free && user.credits < 1) {
    return NextResponse.json(
      {
        error: "Bạn đã hết token.",
        code: "NO_CREDITS",
        canTopup: user.lastTopupDate !== todayVN(),
      },
      { status: 402 },
    );
  }

  const previousSentences = essay.sentences
    .filter((sentence) => doneIds.has(sentence.id))
    .map(
      (sentence) =>
        attempt.submissions.find((item) => item.sentenceId === sentence.id && item.advanced)
          ?.englishText,
    )
    .filter((sentence): sentence is string => Boolean(sentence));

  let grade;
  try {
    grade = await gradeSentence({
      prompt: essay.prompt,
      vietnamese: current.vietnameseHint,
      reference: current.referenceEnglish,
      keywords: parseStringArray(current.keywords),
      previousSentences,
      answer: text,
    });
  } catch (error) {
    console.error("Không chấm được câu:", error);
    return NextResponse.json(
      { error: "Chưa chấm được câu. Token chưa bị trừ, hãy thử lại." },
      { status: 503 },
    );
  }

  const outcome = scoreOutcome(grade.accuracy, grade.breakdown, grade.errors);
  const isPerfect = outcome.isPerfect;

  // Trừ lượt chỉ sau khi đã có kết quả chấm, và chỉ trừ được nếu còn lượt.
  // Lần nộp lại ngay sau khi bị chặn chỉ vì ngữ pháp thì miễn phí.
  const saved = await prisma.$transaction(async (tx) => {
    if (!free) {
      const charged = await tx.user.updateMany({
        where: { id: user.id, credits: { gte: 1 } },
        data: { credits: { decrement: 1 } },
      });
      if (charged.count === 0) return { type: "no_credits" as const };
    }

    const alreadyAdvanced = await tx.submission.findFirst({
      where: { attemptId: attempt.id, sentenceId: current.id, advanced: true },
    });
    if (alreadyAdvanced) {
      if (!free) {
        await tx.user.update({
          where: { id: user.id },
          data: { credits: { increment: 1 } },
        });
      }
      return { type: "conflict" as const };
    }

    await tx.submission.create({
      data: {
        attemptId: attempt.id,
        sentenceId: current.id,
        englishText: text,
        accuracy: outcome.accuracy,
        scoreBreakdown: grade.breakdown ? JSON.stringify(grade.breakdown) : null,
        errors: JSON.stringify(grade.errors),
        blockReason: outcome.blockReason,
        creditCost: free ? 0 : 1,
        suggestedImprovements: JSON.stringify(
          isPerfect ? [] : grade.suggested_improvements,
        ),
        comment: grade.comment,
        isPerfect,
        pointsAwarded: outcome.points,
        advanced: outcome.advanced,
        aiMode: grade.aiMode,
      },
    });

    const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    const streakUpdate = outcome.advanced
      ? nextStreak(fresh.lastStudyDate, fresh.streak)
      : null;
    await tx.user.update({
      where: { id: user.id },
      data: {
        points: { increment: outcome.points },
        ...(streakUpdate
          ? { streak: streakUpdate.streak, lastStudyDate: streakUpdate.lastStudyDate }
          : {}),
      },
    });

    const finished = doneIds.size + (outcome.advanced ? 1 : 0) >= essay.sentences.length;
    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        pointsEarned: { increment: outcome.points },
        status: finished ? "completed" : "in_progress",
        completedAt: finished ? new Date() : null,
      },
    });

    return { type: "ok" as const, finished };
  });

  if (saved.type === "no_credits") {
    return NextResponse.json(
      { error: "Bạn đã hết token.", code: "NO_CREDITS" },
      { status: 402 },
    );
  }

  const state = await buildPracticeState(user.id, essay.slug, attempt.id);
  if (saved.type === "conflict") {
    return NextResponse.json(
      { ...state, error: "Câu này vừa được ghi nhận. Trang đã cập nhật." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ...state, completed: saved.finished });
}
