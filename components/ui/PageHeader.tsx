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
  const { actions, title, className } = props;

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 bg-transparent pb-2",
        className,
      )}
    >
      <h1 className="min-w-0 truncate py-1 text-[32px] font-black leading-[1.18] tracking-normal text-foreground md:text-[36px]">
        {title}
      </h1>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
