import { searchGlossary } from "@/data/glossary";
import type {
  DictionaryDirection,
  DictionaryMeaning,
  DictionaryResult,
} from "@/lib/dictionary-types";

type MyMemoryResponse = {
  responseStatus?: number | string;
  responseDetails?: string;
  responseData?: {
    translatedText?: string;
    match?: number;
  };
  matches?: {
    translation?: string;
    match?: number;
  }[];
};

type FreeDictionaryEntry = {
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech?: string;
    definitions?: {
      definition?: string;
      example?: string;
    }[];
  }[];
};

const CACHE_TTL = 24 * 60 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; result: DictionaryResult }>();

export function isDictionaryDirection(value: string | null): value is DictionaryDirection {
  return value === "en-vi" || value === "vi-en";
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function unique(values: (string | undefined)[], excluded: string) {
  const seen = new Set([normalize(excluded)]);
  return values.flatMap((value) => {
    const cleaned = value?.trim();
    if (!cleaned || seen.has(normalize(cleaned))) return [];
    seen.add(normalize(cleaned));
    return [cleaned];
  });
}

// Dịch nghĩa qua MyMemory. Muốn đổi sang DeepL/Google Translate chỉ cần viết
// lại hàm này (cùng chữ ký) — route và phần cache/fallback không đổi.
async function translate(
  query: string,
  direction: DictionaryDirection,
): Promise<{ translation: string; alternatives: string[] }> {
  const languagePair = direction === "en-vi" ? "en|vi" : "vi|en";
  const params = new URLSearchParams({
    q: query,
    langpair: languagePair,
    mt: "1",
  });
  const contactEmail = process.env.DICTIONARY_CONTACT_EMAIL?.trim();
  if (contactEmail) params.set("de", contactEmail);

  const response = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`,
    {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok) throw new Error(`MyMemory trả về ${response.status}`);

  const data = (await response.json()) as MyMemoryResponse;
  const translation = data.responseData?.translatedText?.trim() ?? "";
  const responseStatus = Number(data.responseStatus ?? response.status);
  if (responseStatus >= 400 || !translation) {
    throw new Error(data.responseDetails || "MyMemory không có bản dịch");
  }

  return {
    translation,
    alternatives: unique(
      (data.matches ?? [])
        .filter((match) => (match.match ?? 0) >= 0.5)
        .map((match) => match.translation),
      translation,
    ).slice(0, 4),
  };
}

// Phiên âm/định nghĩa tiếng Anh qua Free Dictionary API. Chỉ áp dụng cho
// chiều en-vi, và chỉ với từ/cụm ngắn.
async function getEnglishDetails(word: string) {
  if (word.split(/\s+/).length > 3) {
    return { phonetic: null, audio: null, meanings: [] as DictionaryMeaning[] };
  }

  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok) {
    return { phonetic: null, audio: null, meanings: [] as DictionaryMeaning[] };
  }

  const entries = (await response.json()) as FreeDictionaryEntry[];
  const entry = entries[0];
  const phonetic =
    entry?.phonetic?.trim() ||
    entry?.phonetics?.find((item) => item.text?.trim())?.text?.trim() ||
    null;
  const rawAudio = entry?.phonetics?.find((item) => item.audio)?.audio ?? null;
  const audio = rawAudio?.startsWith("//") ? `https:${rawAudio}` : rawAudio;
  const meanings =
    entry?.meanings
      ?.flatMap((meaning) =>
        (meaning.definitions ?? []).slice(0, 2).flatMap((definition) => {
          if (!definition.definition) return [];
          return [
            {
              partOfSpeech: meaning.partOfSpeech ?? "",
              definition: definition.definition,
              example: definition.example ?? null,
            },
          ];
        }),
      )
      .slice(0, 4) ?? [];

  return { phonetic, audio, meanings };
}

function localFallback(query: string, direction: DictionaryDirection) {
  const entry = searchGlossary(query)[0];
  if (!entry) return null;
  return {
    query,
    direction,
    translation: direction === "en-vi" ? entry.meaning : entry.word,
    alternatives: [],
    phonetic: null,
    audio: null,
    meanings: entry.example
      ? [
          {
            partOfSpeech: "cụm từ trong bài",
            definition: entry.example,
            example: null,
          },
        ]
      : [],
    source: "local" as const,
  };
}

/**
 * Tra một từ/cụm, có cache 24h và fallback về sổ từ nội bộ (glossary) khi
 * dịch vụ trực tuyến lỗi. Đây là điểm vào duy nhất mà route dictionary cần
 * gọi — đổi nhà cung cấp dịch chỉ cần sửa trong file này.
 */
export async function lookupWord(
  query: string,
  direction: DictionaryDirection,
): Promise<DictionaryResult> {
  const cacheKey = `${direction}:${normalize(query)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    const [translated, details] = await Promise.all([
      translate(query, direction),
      direction === "en-vi"
        ? getEnglishDetails(query).catch(() => ({
            phonetic: null,
            audio: null,
            meanings: [] as DictionaryMeaning[],
          }))
        : Promise.resolve({
            phonetic: null,
            audio: null,
            meanings: [] as DictionaryMeaning[],
          }),
    ]);
    const result: DictionaryResult = {
      query,
      direction,
      ...translated,
      ...details,
      source: "online",
    };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL, result });
    return result;
  } catch (error) {
    console.error("Không tra được từ điển trực tuyến:", error);
    const fallback = localFallback(query, direction);
    if (fallback) return fallback;
    throw error;
  }
}
