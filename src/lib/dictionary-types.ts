export type DictionaryDirection = "en-vi" | "vi-en";

export type DictionaryMeaning = {
  partOfSpeech: string;
  definition: string;
  example: string | null;
};

export type DictionaryResult = {
  query: string;
  direction: DictionaryDirection;
  translation: string;
  alternatives: string[];
  phonetic: string | null;
  audio: string | null;
  meanings: DictionaryMeaning[];
  source: "online" | "local";
};
