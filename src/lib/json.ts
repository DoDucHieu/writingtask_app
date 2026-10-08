import type { GradeError, Improvement, ScoreBreakdown } from "@/lib/types";

export function parseBreakdown(raw: string | null): ScoreBreakdown | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const keys = ["meaning", "grammar", "vocabulary", "coherence"] as const;
    if (!keys.every((key) => typeof value?.[key] === "number")) return null;
    return {
      meaning: value.meaning as number,
      grammar: value.grammar as number,
      vocabulary: value.vocabulary as number,
      coherence: value.coherence as number,
    };
  } catch {
    return null;
  }
}

export function parseErrors(raw: string | null): GradeError[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    const criteria = ["meaning", "grammar", "vocabulary", "coherence"];
    return value.flatMap((item) => {
      const record = item as Record<string, unknown> | null;
      if (typeof record?.criterion !== "string" || typeof record.issue !== "string") return [];
      if (!criteria.includes(record.criterion)) return [];
      return [{ criterion: record.criterion as GradeError["criterion"], issue: record.issue }];
    });
  } catch {
    return [];
  }
}

export function parseStringArray(raw: string) {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function parseImprovements(raw: string): Improvement[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      if (typeof record.explanation !== "string") return [];
      return [
        {
          title: typeof record.title === "string" ? record.title : "Gợi ý",
          explanation: record.explanation,
          example: typeof record.example === "string" ? record.example : "",
        },
      ];
    });
  } catch {
    return [];
  }
}
