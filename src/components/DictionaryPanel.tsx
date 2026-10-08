"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type {
  Accent,
  DictionaryDirection,
  DictionaryResult,
  Pronunciation,
} from "@/lib/dictionary-types";

const LANGUAGE_LABEL = { en: "English", vi: "Vietnamese" } as const;
const ACCENT_LABEL: Record<Accent, string> = { uk: "UK", us: "US" };
const ACCENT_NAME: Record<Accent, string> = { uk: "Anh–Anh", us: "Anh–Mỹ" };
const ACCENT_LANG: Record<Accent, string> = { uk: "en-GB", us: "en-US" };

export function DictionaryPanel() {
  const [direction, setDirection] = useState<DictionaryDirection>("en-vi");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [playing, setPlaying] = useState<Accent | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setResult(null);
    setError("");
  }, [direction]);

  useEffect(() => () => stopPlayback(), []);

  function stopPlayback() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function speakWithBrowser(word: string, accent: Accent) {
    if (!("speechSynthesis" in window)) {
      setPlaying(null);
      setError("Trình duyệt này không hỗ trợ đọc phát âm.");
      return;
    }
    const lang = ACCENT_LANG[accent];
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    const voice = window.speechSynthesis
      .getVoices()
      .find((item) => item.lang.replace("_", "-").toLowerCase() === lang.toLowerCase());
    if (voice) utterance.voice = voice;
    utterance.onend = () => setPlaying(null);
    utterance.onerror = () => setPlaying(null);
    window.speechSynthesis.speak(utterance);
  }

  function play(pronunciation: Pronunciation) {
    const word = result?.english;
    if (!word) return;
    stopPlayback();
    setPlaying(pronunciation.accent);

    if (!pronunciation.audio) {
      speakWithBrowser(word, pronunciation.accent);
      return;
    }
    const audio = new Audio(pronunciation.audio);
    audioRef.current = audio;
    audio.onended = () => setPlaying(null);
    audio.play().catch(() => speakWithBrowser(word, pronunciation.accent));
  }

  async function lookup(event: FormEvent) {
    event.preventDefault();
    const word = query.trim();
    if (!word || pending) return;

    setPending(true);
    setError("");
    const response = await fetch(
      `/api/dictionary?q=${encodeURIComponent(word)}&direction=${direction}`,
    );
    const data = (await response.json().catch(() => null)) as
      | (DictionaryResult & { error?: string })
      | null;
    setPending(false);

    if (!response.ok || !data) {
      setResult(null);
      setError(data?.error ?? "Không tra được từ này.");
      return;
    }
    setResult(data);
  }

  const [source, target] = direction === "en-vi" ? (["en", "vi"] as const) : (["vi", "en"] as const);

  function swapDirection() {
    setDirection(direction === "en-vi" ? "vi-en" : "en-vi");
    setQuery(result?.translation ?? query);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Từ điển hai chiều
        </h2>
        <span className="text-[10px] text-zinc-600">MyMemory</span>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 rounded-lg bg-white/5 p-1 text-xs">
        <span className="rounded-md bg-gold px-2 py-1.5 text-center font-semibold text-gold-ink">
          {LANGUAGE_LABEL[source]}
        </span>
        <button
          type="button"
          onClick={swapDirection}
          aria-label={`Đảo chiều dịch: ${LANGUAGE_LABEL[target]} sang ${LANGUAGE_LABEL[source]}`}
          title="Đảo chiều dịch"
          className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-zinc-200 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 transition-transform duration-300 ${
              direction === "vi-en" ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <path d="M7 7h13l-4-4" />
            <path d="M17 17H4l4 4" />
          </svg>
        </button>
        <span className="rounded-md px-2 py-1.5 text-center text-zinc-300">
          {LANGUAGE_LABEL[target]}
        </span>
      </div>

      <form onSubmit={lookup} className="mt-2 flex gap-1.5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            direction === "en-vi" ? "Ví dụ: inequality" : "Ví dụ: bất bình đẳng"
          }
          maxLength={100}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-gold focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className="rounded-lg bg-white/10 px-3 text-xs font-medium disabled:opacity-50"
        >
          {pending ? "Đang tra..." : "Tra"}
        </button>
      </form>

      {error && <p className="mt-2 text-xs leading-5 text-danger">{error}</p>}

      {result && (
        <div className="mt-3 rounded-xl bg-white/[0.04] p-3">
          <p
            className={`font-serif text-lg font-semibold ${
              result.direction === "vi-en" ? "text-gold" : "text-fg"
            }`}
          >
            {result.english ?? result.translation}
          </p>

          {result.english && (
            <div className="mt-2 space-y-1.5">
              {result.phonetic && (
                <p className="text-xs text-zinc-400">/{result.phonetic}/</p>
              )}
              {result.pronunciations.map((pronunciation) => (
                <div key={pronunciation.accent} className="flex items-center gap-2">
                  <span className="w-7 rounded bg-white/10 py-0.5 text-center text-[10px] font-semibold text-zinc-300">
                    {ACCENT_LABEL[pronunciation.accent]}
                  </span>
                  {pronunciation.text ? (
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-200">
                      /{pronunciation.text}/
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-600">
                      Chưa có phiên âm
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => play(pronunciation)}
                    aria-label={`Nghe giọng ${ACCENT_NAME[pronunciation.accent]}`}
                    title={`Nghe giọng ${ACCENT_NAME[pronunciation.accent]}`}
                    className={`grid h-7 w-7 place-items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      playing === pronunciation.accent
                        ? "bg-gold text-gold-ink"
                        : "bg-white/10 text-zinc-200 hover:bg-white/20"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M11 5 6 9H2v6h4l5 4V5z" />
                      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                      <path d="M19 5a10 10 0 0 1 0 14" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {result.direction === "en-vi" && result.english && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Nghĩa tiếng Việt
              </p>
              <p className="mt-1 font-serif text-lg font-semibold text-gold">
                {result.translation}
              </p>
            </div>
          )}

          {result.alternatives.length > 0 && (
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Cách dịch khác: {result.alternatives.join(" · ")}
            </p>
          )}

          {result.meanings.length > 0 && (
            <ol className="mt-3 space-y-2 border-t border-white/10 pt-3">
              {result.meanings.map((meaning, index) => (
                <li key={`${meaning.partOfSpeech}-${meaning.definition}-${index}`}>
                  {meaning.partOfSpeech && (
                    <span className="text-[11px] font-medium italic text-sky-300">
                      {meaning.partOfSpeech}
                    </span>
                  )}
                  <p className="mt-0.5 text-xs leading-5 text-zinc-300">
                    {meaning.definition}
                  </p>
                  {meaning.example && (
                    <p className="mt-0.5 font-serif text-xs text-zinc-500">
                      “{meaning.example}”
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}

          {result.source === "local" && (
            <p className="mt-2 text-[10px] text-zinc-600">
              Đang dùng sổ từ trong bài vì dịch vụ trực tuyến chưa phản hồi.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
