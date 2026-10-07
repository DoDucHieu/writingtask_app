export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-[#f0c14b] ${className}`}
      aria-hidden="true"
    />
  );
}
