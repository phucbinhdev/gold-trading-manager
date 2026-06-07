"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

const STORAGE_PREFIX = "scroll-position:";

function getRouteKey(pathname: string, search: string) {
  return `${pathname}${search ? `?${search}` : ""}`;
}

function restoreWindowScroll(key: string) {
  const stored = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
  if (!stored) return;

  const y = Number(stored);
  if (!Number.isFinite(y)) return;

  let frame = 0;
  const restore = () => {
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
    frame += 1;
    if (frame < 4) {
      window.requestAnimationFrame(restore);
    }
  };

  window.requestAnimationFrame(restore);
}

export function ScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(
    () => getRouteKey(pathname, searchParams.toString()),
    [pathname, searchParams],
  );

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    restoreWindowScroll(routeKey);

    const save = () => {
      window.sessionStorage.setItem(
        `${STORAGE_PREFIX}${routeKey}`,
        String(window.scrollY),
      );
    };

    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);

    return () => {
      save();
      window.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
    };
  }, [routeKey]);

  return null;
}
