import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfTodayVN, todayVN } from "@/lib/dates";
import type { UserStats } from "@/lib/types";

export async function presentUser(user: User): Promise<UserStats> {
  const todayStart = startOfTodayVN();
  const acceptedToday = await prisma.submission.findMany({
    where: {
      advanced: true,
      createdAt: { gte: todayStart },
      attempt: { userId: user.id },
    },
    select: { accuracy: true },
  });
  const average =
    acceptedToday.length > 0
      ? acceptedToday.reduce((sum, item) => sum + item.accuracy, 0) / acceptedToday.length
      : 0;

  const achievements: UserStats["achievements"] = [];
  if (user.streak >= 5) {
    achievements.push({
      title: `${user.streak} Day Streak`,
      detail: "Bạn đã học liên tục từ 5 ngày.",
    });
  } else if (user.streak >= 2) {
    achievements.push({
      title: `${user.streak} Day Streak`,
      detail: "Học thêm ngày mai để giữ chuỗi.",
    });
  } else if (user.streak === 1) {
    achievements.push({
      title: "Ngày đầu tiên",
      detail: "Một câu đạt hôm nay đã mở chuỗi.",
    });
  }
  if (acceptedToday.length > 0 && average >= 90) {
    achievements.push({
      title: "Bright Mind",
      detail: "Độ chính xác các câu đạt hôm nay từ 90%.",
    });
  }
  if (user.points >= 30) {
    achievements.push({
      title: "Ngòi bút chắc",
      detail: "Bạn đã tích lũy từ 30 điểm.",
    });
  }

  return {
    name: user.name,
    email: user.email,
    credits: user.credits,
    points: user.points,
    streak: user.streak,
    canTopup: user.lastTopupDate !== todayVN(),
    achievements,
  };
}
