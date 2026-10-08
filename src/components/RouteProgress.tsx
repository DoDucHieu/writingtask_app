"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const START_EVENT = "wt2:navigate";

/** Bật thanh tiến trình trước `router.push`. Link thường được bắt bằng sự kiện click. */
export function beginRoute() {
  window.dispatchEvent(new Event(START_EVENT));
}

export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  useEffect(() => {
    function start() {
      setActive(true);
    }

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }

    window.addEventListener(START_EVENT, start);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(START_EVENT, start);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setActive(false), 8000);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-white/10"
      role="progressbar"
      aria-label="Đang chuyển trang"
    >
      <div className="route-progress h-full w-1/3 bg-gold" />
    </div>
  );
}
