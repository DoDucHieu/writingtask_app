import type { ComponentType, ReactNode, SVGProps } from "react";
import { BookIcon, LinkIcon, PenIcon, TargetIcon } from "@/components/icons";
import type { ScoreBreakdown } from "@/lib/types";

export const CRITERION_ICONS: Record<keyof ScoreBreakdown, ComponentType<SVGProps<SVGSVGElement>>> = {
  meaning: TargetIcon,
  grammar: PenIcon,
  vocabulary: BookIcon,
  coherence: LinkIcon,
};

export function SectionTitle({
  icon: IconComponent,
  tone = "neutral",
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: "neutral" | "danger" | "gold" | "sky";
  children: ReactNode;
}) {
  const toneClass = {
    neutral: "bg-white/5 text-zinc-300",
    danger: "bg-danger/15 text-danger",
    gold: "bg-gold/15 text-gold",
    sky: "bg-sky-400/10 text-sky-300",
  }[tone];
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${toneClass}`}>
        <IconComponent className="h-3.5 w-3.5" />
      </span>
      {children}
    </h3>
  );
}

/** Vòng tròn điểm: màu theo kết quả (đạt / gần đạt / chưa đạt). */
export function ScoreRing({
  value,
  tone,
  children,
}: {
  value: number;
  tone: "success" | "gold" | "danger" | "muted";
  children: ReactNode;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);
  const stroke = {
    success: "stroke-emerald-400",
    gold: "stroke-gold",
    danger: "stroke-danger",
    muted: "stroke-white/10",
  }[tone];
  return (
    <div className="relative h-[68px] w-[68px] shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" className="stroke-white/[0.07]" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${stroke} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
