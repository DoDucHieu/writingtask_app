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
  if (user.lastTopupDate === today) {
    return NextResponse.json(
      { error: "Hôm nay bạn đã nhận lượt miễn phí. Mai hãy quay lại." },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      credits: { increment: DAILY_TOPUP },
      lastTopupDate: today,
    },
  });

  return NextResponse.json({
    ok: true,
    added: DAILY_TOPUP,
    user: await presentUser(updated),
  });
}
