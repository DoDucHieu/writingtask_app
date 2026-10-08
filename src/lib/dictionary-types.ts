export type DictionaryDirection = "en-vi" | "vi-en";

export type DictionaryMeaning = {
  partOfSpeech: string;
  definition: string;
  example: string | null;
};

export type Accent = "uk" | "us";

export type Pronunciation = {
  accent: Accent;
  text: string | null;
  audio: string | null;
};

export type DictionaryResult = {
  query: string;
  direction: DictionaryDirection;
  translation: string;
  alternatives: string[];
  /** Từ tiếng Anh dùng để đọc: chính từ tra (en-vi) hoặc bản dịch (vi-en). */
  english: string | null;
  /** Phiên âm chung khi API không tách riêng giọng Anh và Mỹ. */
  phonetic: string | null;
  pronunciations: Pronunciation[];
  meanings: DictionaryMeaning[];
  source: "online" | "local";
};
