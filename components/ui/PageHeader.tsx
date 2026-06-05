import { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconColor?: string;
  actions?: ReactNode;
  showSettings?: boolean;
  showBack?: boolean;
  backHref?: string;
  className?: string;
}

export function PageHeader(props: PageHeaderProps) {
  const {
    title,
    subtitle,
    icon,
    iconColor,
    actions,
    showSettings,
    showBack,
    backHref = "/",
    className,
  } = props;

  return (
    <header
      className={cn(
        "pt-[calc(env(safe-area-inset-top)+6px)]",
        "rounded-b-[32px] bg-background/90 pb-3 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showBack ? (
            <Link
              href={backHref}
              aria-label="Quay lại"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : icon ? (
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-white shadow-lg",
                iconColor ?? "bg-primary",
              )}
            >
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Ứng dụng
            </p>
            <h1 className="truncate text-[34px] font-black leading-none tracking-[-0.04em] text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {showSettings ? (
            <Link
              href="/config"
              aria-label="Cấu hình"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 active:scale-95"
            >
              <Settings className="h-5 w-5" />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
