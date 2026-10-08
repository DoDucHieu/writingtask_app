import { z } from "zod";
import { demoGrade, SCORE_CRITERIA, type AiMode, type GradeResult } from "@/lib/grading";
import type { GradeError, Improvement, ScoreBreakdown } from "@/lib/types";

const improvementSchema = z.union([
  z.string().transform((explanation) => ({
    title: "Gợi ý",
    explanation,
    example: "",
  })),
  z.object({
    title: z.string().optional().default("Gợi ý"),
    explanation: z.string(),
    example: z.string().optional().default(""),
  }),
]);

function criterionScore(max: number) {
  return z.coerce
    .number()
    .catch(0)
    .transform((value) => Math.round(Math.min(max, Math.max(0, value))));
}

const maxOf = Object.fromEntries(SCORE_CRITERIA.map((item) => [item.key, item.max])) as Record<
  keyof ScoreBreakdown,
  number
>;

const gradeSchema = z.object({
  scores: z.object({
    meaning: criterionScore(maxOf.meaning),
    grammar: criterionScore(maxOf.grammar),
    vocabulary: criterionScore(maxOf.vocabulary),
    coherence: criterionScore(maxOf.coherence),
  }),
  errors: z
    .array(z.object({ criterion: z.string(), issue: z.string() }).catch({ criterion: "", issue: "" }))
    .catch([])
    .default([]),
  suggested_improvements: z.array(improvementSchema).optional().default([]),
  comment: z
    .string()
    .default("Hãy đọc lại ý tiếng Việt và viết thành một câu tiếng Anh hoàn chỉnh."),
});

export type GradeInput = {
  prompt: string;
  vietnamese: string;
  reference: string;
  keywords: string[];
  previousSentences: string[];
  answer: string;
};

function resolveMode(): AiMode {
  const forced = process.env.AI_PROVIDER;
  if (forced === "demo" || forced === "gemini" || forced === "openai") return forced;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "demo";
}

/**
 * Gọi lại 1 lần khi lỗi được đánh dấu `retryable` (timeout hoặc 5xx) — các API
 * LLM bên ngoài thỉnh thoảng treo kết nối thay vì trả lỗi nhanh.
 */
async function withRetry<T>(run: () => Promise<T>, attempts = 2): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      const isRetryable = isTimeout || (error as Error & { retryable?: boolean }).retryable;
      if (!isRetryable || attempt === attempts) throw error;
    }
  }
  throw new Error("unreachable");
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1] : trimmed) as unknown;
}

function buildPrompt(input: GradeInput) {
  const previous =
    input.previousSentences.length > 0
      ? input.previousSentences.map((sentence, index) => `${index + 1}. ${sentence}`).join("\n")
      : "(Chưa có câu nào được chấp nhận.)";

  return `Bạn là giáo viên IELTS Writing Task 2. Học viên đang viết TỪNG CÂU, dựa trên một ý tiếng Việt.

Đề bài:
${input.prompt}

Các câu tiếng Anh đã được chấp nhận trước đó:
${previous}

Ý tiếng Việt cần diễn đạt ở câu này:
${input.vietnamese}

Câu tham chiếu (chỉ để so ý và độ học thuật, KHÔNG bắt học viên chép nguyên văn):
${input.reference}

Từ khóa gợi ý: ${input.keywords.join(", ")}

Câu học viên vừa viết:
${input.answer}

CHẤM THEO 4 TIÊU CHÍ (cho điểm nguyên từng tiêu chí; app tự cộng thành tổng 100):

1. meaning — Đúng ý (0–40). So với Ý TIẾNG VIỆT, không so từng chữ với câu tham chiếu.
   40: đủ mọi ý, đúng sắc thái và lập trường. 32–39: đủ ý chính, lệch nhẹ sắc thái hoặc thiếu chi tiết phụ.
   20–31: thiếu một ý chính hoặc hiểu sai một phần. 1–19: chỉ đúng phần nhỏ. 0: sai ý, lạc đề, hoặc viết tiếng Việt.
2. grammar — Ngữ pháp & dấu câu (0–30).
   30: không lỗi. 26–29: một lỗi nhỏ không ảnh hưởng nghĩa (mạo từ, số ít/nhiều, viết hoa, thiếu dấu chấm cuối câu).
   18–25: 2–3 lỗi nhỏ hoặc một lỗi rõ (thì, hòa hợp chủ ngữ – động từ, giới từ). 8–17: nhiều lỗi nhưng vẫn hiểu. 0–7: vỡ cấu trúc.
3. vocabulary — Từ vựng học thuật (0–20).
   20: không thể chọn từ nào chính xác hoặc tự nhiên hơn. 19: rất tốt, chỉ một chỗ có thể tinh chỉnh.
   15–18: đúng nghĩa nhưng còn thông thường, collocation hơi gượng, hoặc cụm từ dễ hiểu nhầm (ví dụ "deep learning" là thuật ngữ AI).
   10–14: chung chung, lặp từ, giọng văn nói. 0–9: dùng sai từ làm sai nghĩa.
4. coherence — Mạch lạc (0–10). Xét với đề bài và các câu đã viết trước.
   10: nối tự nhiên, từ nối phù hợp, đúng vai trò trong đoạn. 7–9: thiếu/thừa từ nối hoặc hơi lệch trọng tâm.
   4–6: rời rạc. 0–3: mâu thuẫn với câu trước hoặc lập trường của bài.

Quy trình bắt buộc:
- Trước hết liệt kê lỗi cụ thể vào "errors", mỗi lỗi gắn với một tiêu chí. Soát lần lượt cả 4 tiêu chí, kể cả từng collocation và từ nối, như giám khảo IELTS khó tính. Không có lỗi thì để mảng rỗng.
- Sau đó mới cho điểm. Tiêu chí nào không có lỗi nào trong "errors" thì cho TỐI ĐA. Tiêu chí có lỗi thì PHẢI trừ theo thang trên.
- Diễn đạt khác câu tham chiếu nhưng đúng ý, đúng ngữ pháp KHÔNG phải là lỗi.
- Câu viết bằng tiếng Việt hoặc chỉ là cụm từ rời: mọi tiêu chí rất thấp, tổng dưới 40.
- Không làm tròn theo cảm giác; điểm phải khớp với các lỗi đã nêu.

Trả về JSON thuần, không markdown, đúng thứ tự các khóa sau:
{
  "errors": [
    { "criterion": "meaning" | "grammar" | "vocabulary" | "coherence", "issue": "mô tả lỗi ngắn bằng tiếng Việt" }
  ],
  "scores": { "meaning": 0-40, "grammar": 0-30, "vocabulary": 0-20, "coherence": 0-10 },
  "suggested_improvements": [
    { "title": "tiêu đề ngắn tiếng Việt", "explanation": "giải thích sư phạm bằng tiếng Việt", "example": "một câu tiếng Anh viết lại hay hơn" }
  ],
  "comment": "nhận xét chung ngắn bằng tiếng Việt"
}

Quy tắc khác:
- suggested_improvements, comment và issue phải bằng tiếng Việt. example là tiếng Anh.
- Tối đa 2 gợi ý, ưu tiên sửa các lỗi trong "errors". Dạy cách viết hay (từ nối, giọng học thuật, độ dài một câu), không chỉ sửa lỗi chính tả.
- Nếu "errors" rỗng và mọi tiêu chí đạt tối đa thì suggested_improvements là mảng rỗng.
- Không khen xã giao. Comment nói rõ câu đã qua ý chưa và mất điểm chủ yếu ở đâu.`;
}

function toResult(raw: unknown, aiMode: AiMode): GradeResult {
  const parsed = gradeSchema.parse(raw);
  const breakdown: ScoreBreakdown = parsed.scores;
  const accuracy = SCORE_CRITERIA.reduce((sum, item) => sum + breakdown[item.key], 0);
  const improvements: Improvement[] = parsed.suggested_improvements.slice(0, 2);
  const errors: GradeError[] = parsed.errors.flatMap((item) =>
    item.criterion in maxOf && item.issue.trim()
      ? [{ criterion: item.criterion as GradeError["criterion"], issue: item.issue.trim() }]
      : [],
  );
  const isPerfect = accuracy >= 98 && errors.length === 0;
  return {
    accuracy,
    breakdown,
    errors,
    suggested_improvements: isPerfect ? [] : improvements,
    comment: parsed.comment,
    is_perfect: isPerfect,
    aiMode,
  };
}

async function callGemini(input: GradeInput): Promise<GradeResult> {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  // 3.8 Flash không nhận mức minimal và mặc định suy nghĩ rất lâu, dễ quá hạn rồi trả 503.
  const thinkingLevel = /3\.[78]/.test(model) ? "low" : "minimal";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          thinkingConfig: { thinkingLevel },
          maxOutputTokens: 1200,
        },
      }),
    },
  );
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    const error = new Error(`Gemini trả về ${response.status}: ${detail}`);
    (error as Error & { retryable?: boolean }).retryable = response.status >= 500;
    throw error;
  }
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts
      ?.filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join("") ?? "";
  return toResult(extractJson(text), "gemini");
}

async function callOpenAI(input: GradeInput): Promise<GradeResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Bạn chấm IELTS Writing và chỉ trả về JSON hợp lệ.",
        },
        { role: "user", content: buildPrompt(input) },
      ],
    }),
  });
  if (!response.ok) {
    const error = new Error(`OpenAI trả về ${response.status}`);
    (error as Error & { retryable?: boolean }).retryable = response.status >= 500;
    throw error;
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return toResult(extractJson(text), "openai");
}

type Provider = (input: GradeInput) => Promise<GradeResult>;

/**
 * Một provider mới (Claude, Muse AI, ...) chỉ cần: viết hàm `callX()` gọi
 * endpoint riêng rồi trả về qua `toResult(extractJson(text), "x")`, thêm "x"
 * vào union `AiMode` (xem grading.ts), và đăng ký ở đây. Không cần sửa route
 * hay UI — chúng chỉ biết tới `gradeSentence()`.
 */
const providers: Record<AiMode, Provider> = {
  demo: async (input) => demoGrade(input),
  gemini: async (input) => {
    if (!process.env.GEMINI_API_KEY) throw new Error("Thiếu GEMINI_API_KEY");
    return withRetry(() => callGemini(input));
  },
  openai: async (input) => {
    if (!process.env.OPENAI_API_KEY) throw new Error("Thiếu OPENAI_API_KEY");
    return withRetry(() => callOpenAI(input));
  },
};

export async function gradeSentence(input: GradeInput): Promise<GradeResult> {
  return providers[resolveMode()](input);
}
