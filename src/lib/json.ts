import type { Improvement } from "@/lib/types";

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
