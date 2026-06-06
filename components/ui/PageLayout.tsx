"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("page-shell app-container space-y-6", className)}>
      {children}
    </div>
  );
}

interface LoadingProps {
  className?: string;
}

export function Loading({ className }: LoadingProps) {
  return (
    <div
      className={cn(
        "space-y-4 py-8",
        className
      )}
    >
      <div className="h-28 animate-pulse rounded-[28px] bg-muted/70 md:h-36" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-20 animate-pulse rounded-[24px] bg-muted/50 md:h-28" />
        <div className="h-20 animate-pulse rounded-[24px] bg-muted/40 md:h-28" />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "soft-surface flex flex-col items-center justify-center gap-4 rounded-[28px] border border-border/50 px-5 py-10 text-center",
        className
      )}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div>
        <p className="text-base font-bold leading-6 text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
