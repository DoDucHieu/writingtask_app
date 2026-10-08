import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { todayVN } from "@/lib/dates";
import { DAILY_TOPUP } from "@/lib/grading";
import { prisma } from "@/lib/prisma";
import { presentUser } from "@/lib/user-stats";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const today = todayVN();
  // Kiểm tra và cộng lượt trong cùng một câu lệnh để bấm đúp không nhận được 2 lần.
  const granted = await prisma.user.updateMany({
    where: {
      id: user.id,
      OR: [{ lastTopupDate: null }, { lastTopupDate: { not: today } }],
    },
    data: {
      credits: { increment: DAILY_TOPUP },
      lastTopupDate: today,
    },
  });
  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  if (granted.count === 0) {
    return NextResponse.json(
      {
        error: "Hôm nay bạn đã nhận token miễn phí. Mai hãy quay lại.",
        user: await presentUser(fresh),
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    added: DAILY_TOPUP,
    user: await presentUser(fresh),
  });
}
