"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  color?: string;
  className?: string;
}

export function FAB({
  onClick,
  icon,
  color = "bg-primary",
  className,
}: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_18px_34px_-18px_rgba(0,0,0,0.55)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:scale-[1.02] active:scale-[0.96] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
        color,
        className
      )}
    >
      {icon || <Plus className="h-8 w-8" />}
    </button>
  );
}