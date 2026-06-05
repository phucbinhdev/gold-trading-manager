import { ReactNode } from "react";

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
  const { title, className } = props;

  return (
    <header
      className={cn(
        "pt-[calc(env(safe-area-inset-top)+6px)]",
        "bg-transparent pb-2",
        className,
      )}
    >
      <h1 className="truncate text-[34px] font-black leading-none tracking-[-0.04em] text-foreground">
        {title}
      </h1>
    </header>
  );
}
