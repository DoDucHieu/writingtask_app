import type { Improvement } from "@/lib/types";

export const PASS_THRESHOLD = 70;
export const INITIAL_CREDITS = 20;
export const DAILY_TOPUP = 10;

export type AiMode = "gemini" | "openai" | "demo";

export type GradeResult = {
  accuracy: number;
  suggested_improvements: Improvement[];
  comment: string;
  is_perfect: boolean;
  aiMode: AiMode;
};

/**
 * Câu từ 70% mới qua và được cộng điểm.
 * 100% = 10 điểm, 84% = 8 điểm. Dưới ngưỡng thì giữ nguyên câu để viết lại.
 */
export function scoreOutcome(accuracy: number) {
  const rounded = Math.round(Math.min(100, Math.max(0, accuracy)) * 100) / 100;
  const isPerfect = rounded >= 98;
  const advanced = rounded >= PASS_THRESHOLD;
  const points = advanced ? Math.max(1, Math.round(rounded / 10)) : 0;
  return { accuracy: rounded, isPerfect, advanced, points };
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string) {
  const stop = new Set([
    "a",
    "an",
    "the",
    "of",
    "to",
    "and",
    "in",
    "on",
    "for",
    "is",
    "are",
    "be",
    "that",
    "this",
    "it",
    "their",
    "with",
  ]);
  return normalize(text)
    .split(" ")
    .filter((word) => word && !stop.has(word));
}

function hasVietnamese(text: string) {
  return /[ăâêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵđ]/i.test(
    text,
  );
}

export function heuristicAccuracy(answer: string, reference: string, keywords: string[]) {
  if (hasVietnamese(answer)) return 32;
  if (normalize(answer) === normalize(reference)) return 100;

  const userTokens = tokens(answer);
  const referenceTokens = new Set(tokens(reference));
  if (userTokens.length < 5) return 28;

  const userSet = new Set(userTokens);
  let overlap = 0;
  for (const word of userSet) {
    if (referenceTokens.has(word)) overlap += 1;
  }
  const recall = overlap / Math.max(referenceTokens.size, 1);
  const precision = overlap / Math.max(userSet.size, 1);
  const f1 = (2 * precision * recall) / Math.max(precision + recall, 0.001);
  const keywordHits = keywords.filter((keyword) =>
    normalize(answer).includes(normalize(keyword)),
  ).length;
  const keywordRatio = keywords.length ? keywordHits / keywords.length : 0;

  let accuracy = Math.round(f1 * 70 + keywordRatio * 30);
  const wordCount = normalize(answer).split(" ").filter(Boolean).length;
  if (wordCount < 8) accuracy = Math.min(accuracy, 48);
  if (wordCount >= 12 && keywordRatio === 1) accuracy = Math.max(accuracy, 86);
  return Math.max(0, Math.min(100, accuracy));
}

/** Bộ chấm dự phòng khi chưa có API key. Không thay thế giáo viên AI. */
export function demoGrade(input: {
  answer: string;
  reference: string;
  keywords: string[];
}): GradeResult {
  const accuracy = heuristicAccuracy(input.answer, input.reference, input.keywords);
  const outcome = scoreOutcome(accuracy);
  const missing = input.keywords.filter(
    (keyword) => !normalize(input.answer).includes(normalize(keyword)),
  );

  const starter = input.reference.split(" ").slice(0, 3).join(" ");
  const suggested_improvements: Improvement[] = [];
  if (!outcome.isPerfect && hasVietnamese(input.answer)) {
    suggested_improvements.push({
      title: "Viết bằng tiếng Anh",
      explanation:
        "Ô nộp là câu tiếng Anh. Hãy đọc ý tiếng Việt rồi diễn đạt lại, đừng để nguyên tiếng Việt.",
      example: "",
    });
  } else if (!outcome.isPerfect && missing.length > 0) {
    suggested_improvements.push({
      title: "Đưa đủ ý chính",
      explanation: `Câu chưa chạm các cụm: ${missing.slice(0, 3).join(", ")}. Hãy dùng chúng tự nhiên, không cần dịch từng chữ.`,
      example: outcome.advanced ? input.reference : `${starter} …`,
    });
  }
  if (!outcome.isPerfect && suggested_improvements.length < 2) {
    suggested_improvements.push({
      title: "Viết thành một câu học thuật",
      explanation:
        "Giữ một chủ ngữ rõ, một động từ chính, và phần mở rộng ý. Tránh câu cụt hoặc liệt kê từ rời.",
      example: outcome.advanced ? input.reference : `${starter} …`,
    });
  }

  const comment = outcome.isPerfect
    ? "Câu đúng ý và có giọng văn phù hợp bài luận."
    : outcome.advanced
      ? "Ý chính đã có. Bạn có thể viết gọn và chắc hơn ở lần sau."
      : "Câu chưa đủ ý hoặc chưa thành một câu tiếng Anh hoàn chỉnh. Hãy viết lại trước khi sang câu tiếp.";

  return {
    accuracy: outcome.accuracy,
    suggested_improvements: outcome.isPerfect ? [] : suggested_improvements.slice(0, 2),
    comment,
    is_perfect: outcome.isPerfect,
    aiMode: "demo",
  };
}
