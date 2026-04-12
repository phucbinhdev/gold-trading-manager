"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Settings as SettingsIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconColor?: string;
  actions?: ReactNode;
  showSettings?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  iconColor = "bg-primary",
  actions,
  showSettings = false,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
              iconColor
            )}
          >
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {showSettings && (
          <button
            onClick={() => router.push("/config")}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <SettingsIcon className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}