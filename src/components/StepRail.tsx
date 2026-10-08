import type { PracticeSentence } from "@/lib/types";

export function StepRail({
  status,
  last,
}: {
  status: PracticeSentence["status"];
  last: boolean;
}) {
  return (
    <div className="relative flex w-5 shrink-0 justify-center pt-3" aria-hidden="true">
      {!last && (
        <span
          className={`absolute top-8 -bottom-3 w-px ${
            status === "done" ? "bg-emerald-500/50" : "bg-white/10"
          }`}
        />
      )}
      {status === "done" ? (
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-emerald-950">
          ✓
        </span>
      ) : status === "current" ? (
        <span className="relative h-5 w-5 rounded-full bg-gold ring-4 ring-gold/20" />
      ) : (
        <span className="relative h-5 w-5 rounded-full border-2 border-zinc-600 bg-ink" />
      )}
    </div>
  );
}
