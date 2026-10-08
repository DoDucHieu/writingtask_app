import { searchGlossary } from "@/data/glossary";
import type {
  Accent,
  DictionaryDirection,
  DictionaryMeaning,
  DictionaryResult,
  Pronunciation,
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

const ACCENTS: Accent[] = ["uk", "us"];

type EnglishDetails = {
  phonetic: string | null;
  pronunciations: Pronunciation[];
  meanings: DictionaryMeaning[];
};

function emptyDetails(): EnglishDetails {
  return {
    phonetic: null,
    pronunciations: ACCENTS.map((accent) => ({ accent, text: null, audio: null })),
    meanings: [],
  };
}

function cleanIpa(text: string | undefined) {
  // Wiktionary chấm tách âm tiết (/ˌɪn.ɪˈkwɒl.ɪ.ti/); từ điển phổ thông không dùng.
  const cleaned = text
    ?.trim()
    .replace(/^[/[]+|[/\]]+$/g, "")
    .replace(/\./g, "")
    .trim();
  return cleaned || null;
}

// Free Dictionary chỉ đánh dấu giọng qua tên file audio: "...-uk.mp3", "...-us.mp3".
function accentOf(audio: string): Accent | null {
  const match = audio.match(/-(uk|us)\.mp3$/i);
  return match ? (match[1].toLowerCase() as Accent) : null;
}

function buildPronunciations(entries: FreeDictionaryEntry[]): Pronunciation[] {
  const phonetics = entries.flatMap((entry) => entry.phonetics ?? []);
  return ACCENTS.map((accent) => {
    const withAudio = phonetics.filter((item) => item.audio && accentOf(item.audio) === accent);
    const best = withAudio.find((item) => cleanIpa(item.text)) ?? withAudio[0];
    const audio = best?.audio ?? null;
    return {
      accent,
      text: cleanIpa(best?.text),
      audio: audio?.startsWith("//") ? `https:${audio}` : audio,
    };
  });
}

async function fetchFreeDictionary(word: string): Promise<FreeDictionaryEntry[]> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as unknown;
    return Array.isArray(data) ? (data as FreeDictionaryEntry[]) : [];
  } catch {
    return [];
  }
}

const UK_LABELS = new Set(["rp", "uk", "british", "ssb", "england", "southern england", "received pronunciation"]);
const US_LABELS = new Set(["ga", "us", "genam", "general american", "american", "usa"]);

function accentsFromLabels(labels: string[]): Accent[] {
  const found = new Set<Accent>();
  for (const label of labels) {
    const key = label.trim().toLowerCase();
    if (UK_LABELS.has(key)) found.add("uk");
    if (US_LABELS.has(key)) found.add("us");
  }
  return [...found];
}

type WikiTemplate = { name: string; positional: string[]; named: Record<string, string> };

function parseTemplates(line: string): WikiTemplate[] {
  return [...line.matchAll(/\{\{([^{}]*)\}\}/g)].map((match) => {
    const [name, ...params] = match[1].split("|");
    const positional: string[] = [];
    const named: Record<string, string> = {};
    for (const param of params) {
      const eq = param.indexOf("=");
      if (eq > 0 && /^[\w-]+$/.test(param.slice(0, eq))) {
        named[param.slice(0, eq)] = param.slice(eq + 1);
      } else {
        positional.push(param);
      }
    }
    return { name: name.trim().toLowerCase(), positional, named };
  });
}

type WikiPronunciations = {
  byAccent: Partial<Record<Accent, { text: string | null; audio: string | null }>>;
  generic: string | null;
};

/**
 * Đọc mục Pronunciation trong phần English của wikitext Wiktionary. Giọng được
 * ghi bằng tham số `a=RP,US` trên template, hoặc bằng `{{a|en|RP}}` ở dòng cha
 * (dòng `**` con kế thừa giọng của dòng `*`).
 */
function parseWiktionaryPronunciations(wikitext: string): WikiPronunciations {
  const english = wikitext.split(/^==(?!=)/m).find((part) => /^\s*English\s*==/.test(part)) ?? "";
  const result: WikiPronunciations = { byAccent: {}, generic: null };
  const inherited: Accent[][] = [];
  let inPronunciation = false;

  for (const line of english.split("\n")) {
    const heading = line.match(/^=+\s*([^=]+?)\s*=+\s*$/);
    if (heading) {
      inPronunciation = /^Pronunciation/i.test(heading[1]);
      inherited.length = 0;
      continue;
    }
    const bullet = line.match(/^(\*+)/);
    if (!inPronunciation || !bullet) continue;

    const depth = bullet[1].length;
    const templates = parseTemplates(line);
    const ownAccents = accentsFromLabels(
      templates.flatMap((template) => [
        ...(template.named.a?.split(",") ?? []),
        ...(template.name === "a" || template.name === "accent" ? template.positional.slice(1) : []),
      ]),
    );
    const accents = ownAccents.length > 0 ? ownAccents : (inherited[depth - 1] ?? []);
    inherited[depth] = accents;
    inherited.length = depth + 1;

    for (const template of templates) {
      if (template.name === "ipa") {
        const ipa = template.positional.slice(1).find((value) => value.startsWith("/"));
        const text = cleanIpa(ipa);
        if (!text) continue;
        if (accents.length === 0) result.generic ??= text;
        for (const accent of accents) {
          const slot = (result.byAccent[accent] ??= { text: null, audio: null });
          slot.text ??= text;
        }
      }
      if (template.name === "audio") {
        const file = template.positional[1]?.trim();
        const audioAccents = accentsFromLabels(template.named.a?.split(",") ?? []);
        if (!file) continue;
        for (const accent of audioAccents.length > 0 ? audioAccents : accents) {
          const slot = (result.byAccent[accent] ??= { text: null, audio: null });
          slot.audio ??= `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
        }
      }
    }
  }
  return result;
}

async function fetchWiktionary(word: string): Promise<WikiPronunciations | null> {
  const params = new URLSearchParams({
    action: "parse",
    page: word.toLowerCase(),
    prop: "wikitext",
    format: "json",
    formatversion: "2",
    redirects: "1",
  });
  try {
    const response = await fetch(`https://en.wiktionary.org/w/api.php?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
      // Wikimedia yêu cầu User-Agent nhận diện được ứng dụng.
      headers: { Accept: "application/json", "User-Agent": "writingtask-app/0.1" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { parse?: { wikitext?: string } };
    return data.parse?.wikitext ? parseWiktionaryPronunciations(data.parse.wikitext) : null;
  } catch {
    return null;
  }
}

// Phiên âm/định nghĩa tiếng Anh, chỉ với từ/cụm ngắn. Free Dictionary cho định
// nghĩa và audio; Wiktionary bù phiên âm UK/US còn thiếu.
async function getEnglishDetails(word: string): Promise<EnglishDetails> {
  if (word.split(/\s+/).length > 3) return emptyDetails();

  const [entries, wiki] = await Promise.all([fetchFreeDictionary(word), fetchWiktionary(word)]);
  const entry = entries[0];
  const pronunciations = buildPronunciations(entries).map((item) => ({
    ...item,
    text: item.text ?? wiki?.byAccent[item.accent]?.text ?? null,
    audio: item.audio ?? wiki?.byAccent[item.accent]?.audio ?? null,
  }));
  const hasAccentText = pronunciations.some((item) => item.text);
  const phonetic = hasAccentText
    ? null
    : cleanIpa(entries.find((item) => item.phonetic?.trim())?.phonetic) ??
      cleanIpa(entries.flatMap((item) => item.phonetics ?? []).find((item) => item.text?.trim())?.text) ??
      wiki?.generic ??
      null;
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

  return { phonetic, pronunciations, meanings };
}

function safeEnglishDetails(word: string) {
  return getEnglishDetails(word).catch(() => emptyDetails());
}

function localFallback(query: string, direction: DictionaryDirection) {
  const entry = searchGlossary(query)[0];
  if (!entry) return null;
  return {
    query,
    direction,
    translation: direction === "en-vi" ? entry.meaning : entry.word,
    alternatives: [],
    english: direction === "en-vi" ? query : entry.word,
    ...emptyDetails(),
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
    let result: DictionaryResult;
    if (direction === "en-vi") {
      const [translated, details] = await Promise.all([
        translate(query, direction),
        safeEnglishDetails(query),
      ]);
      result = { query, direction, ...translated, english: query, ...details, source: "online" };
    } else {
      const translated = await translate(query, direction);
      const { phonetic, pronunciations } = await safeEnglishDetails(translated.translation);
      result = {
        query,
        direction,
        ...translated,
        english: translated.translation,
        phonetic,
        pronunciations,
        meanings: [],
        source: "online",
      };
    }
    // Kết quả thiếu phiên âm thường do Free Dictionary/Wiktionary lỗi tạm thời;
    // không cache để lần tra sau còn lấy lại được.
    const hasPhonetic = Boolean(result.phonetic) || result.pronunciations.some((item) => item.text);
    if (hasPhonetic || (result.english ?? "").split(/\s+/).length > 3) {
      cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL, result });
    }
    return result;
  } catch (error) {
    console.error("Không tra được từ điển trực tuyến:", error);
    const fallback = localFallback(query, direction);
    if (fallback) return fallback;
    throw error;
  }
}
