"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type {
  DictionaryDirection,
  DictionaryResult,
} from "@/lib/dictionary-types";

export function DictionaryPanel() {
  const [direction, setDirection] = useState<DictionaryDirection>("en-vi");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setResult(null);
    setError("");
  }, [direction]);

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

  function changeDirection(next: DictionaryDirection) {
    if (next === direction) return;
    setDirection(next);
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

      <div className="mt-2 grid grid-cols-2 rounded-lg bg-white/5 p-1 text-xs">
        <button
          type="button"
          onClick={() => changeDirection("en-vi")}
          className={`rounded-md px-2 py-1.5 ${
            direction === "en-vi"
              ? "bg-[#f0c14b] font-semibold text-[#1c1403]"
              : "text-zinc-400"
          }`}
        >
          Anh → Việt
        </button>
        <button
          type="button"
          onClick={() => changeDirection("vi-en")}
          className={`rounded-md px-2 py-1.5 ${
            direction === "vi-en"
              ? "bg-[#f0c14b] font-semibold text-[#1c1403]"
              : "text-zinc-400"
          }`}
        >
          Việt → Anh
        </button>
      </div>

      <form onSubmit={lookup} className="mt-2 flex gap-1.5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            direction === "en-vi" ? "Ví dụ: inequality" : "Ví dụ: bất bình đẳng"
          }
          maxLength={100}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-[#f0c14b] focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className="rounded-lg bg-white/10 px-3 text-xs font-medium disabled:opacity-50"
        >
          {pending ? "Đang tra..." : "Tra"}
        </button>
      </form>

      {error && <p className="mt-2 text-xs leading-5 text-rose-300">{error}</p>}

      {result && (
        <div className="mt-3 rounded-xl bg-white/[0.04] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-serif text-lg font-semibold text-[#f0c14b]">
                {result.translation}
              </p>
              {result.phonetic && (
                <p className="mt-0.5 text-xs text-zinc-400">/{result.phonetic}/</p>
              )}
            </div>
            {result.audio && (
              <>
                <audio ref={audioRef} src={result.audio} preload="none" />
                <button
                  type="button"
                  onClick={() => void audioRef.current?.play()}
                  className="rounded-lg bg-white/10 px-2 py-1 text-xs"
                  aria-label="Nghe phát âm"
                >
                  🔊 Nghe
                </button>
              </>
            )}
          </div>

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
