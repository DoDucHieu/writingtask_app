import type { ReactNode } from "react";

export function StatChip({
  label,
  value,
  icon,
  alert = false,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 sm:min-w-[4.6rem] sm:px-2.5 ${
        alert ? "bg-danger text-danger-ink" : "bg-gold text-gold-ink"
      }`}
    >
      {icon && (
        <span className="hidden h-4 w-4 shrink-0 place-items-center opacity-80 sm:grid">{icon}</span>
      )}
      <div className="min-w-0">
        <div className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide opacity-70 sm:text-[10px]">
          {label}
        </div>
        <div className="whitespace-nowrap text-sm font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}
