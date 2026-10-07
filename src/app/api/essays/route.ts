import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { presentUser } from "@/lib/user-stats";
import type { EssaySummary } from "@/lib/types";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const essays = await prisma.essay.findMany({
    orderBy: { position: "asc" },
    include: {
      sentences: { select: { id: true } },
      attempts: {
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        take: 1,
        include: {
          submissions: {
            where: { advanced: true },
            select: { sentenceId: true },
          },
        },
      },
    },
  });

  const items: EssaySummary[] = essays.map((essay) => {
    const latest = essay.attempts[0];
    const done = new Set(latest?.submissions.map((item) => item.sentenceId) ?? []).size;
    const status = !latest
      ? "new"
      : latest.status === "completed"
        ? "completed"
        : "in_progress";
    return {
      slug: essay.slug,
      title: essay.title,
      prompt: essay.prompt,
      topic: essay.topic,
      difficulty: essay.difficulty,
      sentenceCount: essay.sentences.length,
      status,
      done: status === "completed" ? essay.sentences.length : done,
      total: essay.sentences.length,
      attemptId: latest?.id ?? null,
      pointsEarned: latest?.pointsEarned ?? 0,
    };
  });

  return NextResponse.json({
    user: await presentUser(user),
    essays: items,
  });
}
