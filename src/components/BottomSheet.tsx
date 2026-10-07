"use client";

import { useRef } from "react";

export function BottomSheet({
  title,
  showTitle = true,
  onClose,
  children,
}: {
  title: string;
  showTitle?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const startY = useRef<number | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-fade absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="sheet-up relative flex max-h-[78dvh] flex-col rounded-t-2xl bg-[#121214] ring-1 ring-white/10">
        <div
          className="relative shrink-0 touch-none px-4 pt-2 pb-3"
          onTouchStart={(event) => {
            startY.current = event.touches[0].clientY;
          }}
          onTouchEnd={(event) => {
            if (startY.current !== null && event.changedTouches[0].clientY - startY.current > 60) {
              onClose();
            }
            startY.current = null;
          }}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1 rounded-lg px-2 py-1 text-sm text-zinc-400"
            aria-label="Đóng"
          >
            ✕
          </button>
          {showTitle && <p className="mt-3 text-sm font-semibold">{title}</p>}
        </div>
        <div className="min-h-0 space-y-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
