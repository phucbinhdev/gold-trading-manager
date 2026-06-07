"use client";

import { Loader2 } from "lucide-react";
import { ReactNode, TouchEvent, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const TRIGGER_DISTANCE = 86;
const MAX_DISTANCE = 116;

interface PullToRefreshProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  refreshing?: boolean;
  onRefresh: () => Promise<unknown> | unknown;
}

export function PullToRefresh({
  children,
  className,
  disabled = false,
  refreshing = false,
  onRefresh,
}: PullToRefreshProps) {
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const [distance, setDistance] = useState(0);
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const isRefreshing = refreshing || internalRefreshing;
  const progress = Math.min(distance / TRIGGER_DISTANCE, 1);

  const reset = () => {
    startYRef.current = null;
    pullingRef.current = false;
    setDistance(0);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing || window.scrollY > 0) return;
    startYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing || startYRef.current === null) return;

    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const delta = currentY - startYRef.current;

    if (delta <= 0) {
      reset();
      return;
    }

    if (window.scrollY > 0) return;

    pullingRef.current = true;
    setDistance(Math.min(MAX_DISTANCE, Math.pow(delta, 0.82) * 2.2));
  };

  const handleTouchEnd = async () => {
    if (!pullingRef.current) {
      reset();
      return;
    }

    const shouldRefresh = distance >= TRIGGER_DISTANCE;
    reset();

    if (!shouldRefresh || disabled || isRefreshing) return;

    setInternalRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setInternalRefreshing(false);
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={reset}
    >
      <div
        aria-hidden={!isRefreshing && distance === 0}
        className={cn(
          "pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] flex h-11 -translate-x-1/2 items-center gap-2 rounded-full border bg-background/90 px-4 text-xs font-bold text-foreground opacity-0 shadow-lg backdrop-blur-xl transition-[opacity,transform] duration-150",
          (distance > 0 || isRefreshing) && "opacity-100",
        )}
        style={{
          transform: `translate(-50%, ${isRefreshing ? 0 : Math.min(distance * 0.28, 22)}px)`,
        }}
      >
        <Loader2
          className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          style={{
            transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
          }}
        />
        <span>{isRefreshing ? "Đang làm mới" : "Kéo để làm mới"}</span>
      </div>
      {children}
    </div>
  );
}
