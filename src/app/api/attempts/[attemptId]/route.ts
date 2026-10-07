import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { parseImprovements } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { presentUser } from "@/lib/user-stats";
import type { SummaryState } from "@/lib/types";

type Context = { params: Promise<{ attemptId: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const { attemptId } = await context.params;
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: {
      essay: { include: { sentences: { orderBy: { order: "asc" } } } },
      submissions: true,
    },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Không tìm thấy bài làm." }, { status: 404 });
  }

  const sentences = attempt.essay.sentences.map((sentence) => {
    const related = attempt.submissions
      .filter((item) => item.sentenceId === sentence.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const chosen = related.find((item) => item.advanced) ?? related[related.length - 1] ?? null;
    return {
      order: sentence.order,
      vietnameseHint: sentence.vietnameseHint,
      englishText: chosen?.englishText ?? null,
      referenceEnglish: sentence.referenceEnglish,
      accuracy: chosen?.accuracy ?? null,
      comment: chosen?.comment ?? null,
      isPerfect: chosen?.isPerfect ?? false,
      suggestedImprovements: chosen ? parseImprovements(chosen.suggestedImprovements) : [],
    };
  });

  const scored = sentences.filter((sentence) => sentence.accuracy !== null);
  const averageAccuracy =
    scored.length > 0
      ? scored.reduce((sum, sentence) => sum + (sentence.accuracy ?? 0), 0) / scored.length
      : null;

  const payload: SummaryState = {
    attemptId: attempt.id,
    status: attempt.status,
    pointsEarned: attempt.pointsEarned,
    averageAccuracy,
    essay: {
      slug: attempt.essay.slug,
      title: attempt.essay.title,
      prompt: attempt.essay.prompt,
      topic: attempt.essay.topic,
    },
    sentences,
    user: await presentUser(user),
  };

  return NextResponse.json(payload);
}
