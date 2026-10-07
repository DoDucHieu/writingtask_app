import { z } from "zod";
import { demoGrade, type AiMode, type GradeResult } from "@/lib/grading";
import type { Improvement } from "@/lib/types";

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

const gradeSchema = z.object({
  accuracy: z.coerce.number().min(0).max(100),
  suggested_improvements: z.array(improvementSchema).optional().default([]),
  comment: z
    .string()
    .default("Hãy đọc lại ý tiếng Việt và viết thành một câu tiếng Anh hoàn chỉnh."),
  is_perfect: z.boolean().optional().default(false),
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

Chấm độ đúng ý so với câu tiếng Việt và độ tự nhiên của tiếng Anh học thuật. Diễn đạt khác câu tham chiếu nhưng đúng ý, đúng ngữ pháp vẫn được điểm cao.

Trả về JSON thuần, không markdown, đúng các khóa sau:
{
  "accuracy": số từ 0 đến 100,
  "suggested_improvements": [
    { "title": "tiêu đề ngắn tiếng Việt", "explanation": "giải thích sư phạm bằng tiếng Việt", "example": "một câu tiếng Anh viết lại hay hơn" }
  ],
  "comment": "nhận xét chung ngắn bằng tiếng Việt",
  "is_perfect": true hoặc false
}

Quy tắc:
- suggested_improvements và comment phải bằng tiếng Việt. example là tiếng Anh.
- Tối đa 2 gợi ý. Dạy cách viết hay (từ nối, giọng học thuật, độ dài một câu), không chỉ sửa lỗi chính tả.
- Nếu câu viết bằng tiếng Việt hoặc quá cụt, accuracy dưới 40.
- is_perfect chỉ true khi câu gần như không cần sửa (accuracy từ 98 trở lên). Khi đó suggested_improvements là mảng rỗng.
- Không khen xã giao. Nói rõ câu đã qua ý chưa.`;
}

function toResult(raw: unknown, aiMode: AiMode): GradeResult {
  const parsed = gradeSchema.parse(raw);
  const improvements: Improvement[] = parsed.suggested_improvements.slice(0, 2);
  const isPerfect = parsed.is_perfect || parsed.accuracy >= 98;
  return {
    accuracy: parsed.accuracy,
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
          thinkingConfig: { thinkingLevel },
          maxOutputTokens: 800,
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
