export function StatChip({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div
      className={`min-w-[4.6rem] rounded-lg px-2.5 py-1 ${
        alert ? "bg-rose-400 text-rose-950" : "bg-[#f0c14b] text-[#1c1403]"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-sm font-bold leading-tight">{value}</div>
    </div>
  );
}
