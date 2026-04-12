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
        "fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95",
        color,
        className
      )}
    >
      {icon || <Plus className="h-8 w-8" />}
    </button>
  );
}