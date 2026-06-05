import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
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
        "flex items-start justify-between gap-3 bg-transparent pb-2 pt-[calc(env(safe-area-inset-top)+6px)]",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {showBack ? (
          <Button
            asChild
            variant="outline"
            size="icon-sm"
            className="mt-1 shrink-0 rounded-full bg-background/80"
            data-haptic="selection"
          >
            <Link href={backHref} aria-label="Quay lại">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        ) : icon ? (
          <div
            className={cn(
              "mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/20 text-primary shadow-sm image-outline",
              iconColor,
            )}
          >
            {icon}
          </div>
        ) : null}

        <div className="min-w-0">
          <h1 className="truncate py-1 text-[32px] font-black leading-[1.18] tracking-[-0.02em] text-foreground sm:text-[36px]">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-[28ch] text-sm font-medium leading-5 text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {(actions || showSettings) && (
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {actions}
          {showSettings && (
            <Button
              asChild
              variant="outline"
              size="icon-sm"
              className="rounded-full bg-background/80"
              data-haptic="selection"
            >
              <Link href="/config" aria-label="Mở cấu hình">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
