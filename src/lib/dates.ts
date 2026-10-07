/** Ngày theo lịch Việt Nam, dạng YYYY-MM-DD. Streak và lượt miễn phí dùng mốc này. */
export function todayVN(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function yesterdayOf(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function startOfTodayVN(now = new Date()) {
  return new Date(`${todayVN(now)}T00:00:00+07:00`);
}

/** Học một câu đạt trong ngày mới tính. Cùng ngày không tăng, đúng hôm qua thì nối chuỗi. */
export function nextStreak(lastStudyDate: string | null, streak: number, today = todayVN()) {
  if (lastStudyDate === today) {
    return { streak, lastStudyDate: today };
  }
  if (lastStudyDate === yesterdayOf(today)) {
    return { streak: streak + 1, lastStudyDate: today };
  }
  return { streak: 1, lastStudyDate: today };
}
